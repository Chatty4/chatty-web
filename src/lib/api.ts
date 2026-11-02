// API client for chatty-core and chatty-chat. Contracts: chatty-infra/docs/api-core.md and
// api-chat.md. Adds the access token, turns the contract error body into an ApiError, and on a
// 401 `unauthorized` refreshes the token once and repeats the request (lib/session.ts).

import { ApiError, networkError, readJson, toApiError } from "@/lib/api-error"
import { CHAT_API_URL, CORE_API_URL } from "@/lib/config"
import { getAccessToken, hasStoredSession, refreshSession } from "@/lib/session"

export { ApiError } from "@/lib/api-error"

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
  signal?: AbortSignal
  /** Send the access token (default). False for login, register and other public endpoints. */
  auth?: boolean
  /**
   * Refresh the access token and repeat the request on a 401 (default). False inside
   * withRefreshLock(), where a refresh would wait for the lock it is holding.
   */
  refreshOnExpiry?: boolean
}

async function send(url: string, options: RequestOptions, token: string | null) {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (options.body !== undefined) headers["Content-Type"] = "application/json"
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    return await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw networkError()
  }
}

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const auth = options.auth ?? true
  const token = auth ? getAccessToken() : null

  let response = await send(url, options, token)
  let body = response.status === 204 ? null : await readJson(response)

  // The access token expired or was rejected: refresh it once and try again. Other 401 codes
  // (invalid_credentials, invalid_refresh_token, ...) are answers, not an expired token.
  const expired =
    response.status === 401 && toApiError(response, body).code === "unauthorized"
  if (auth && expired && (options.refreshOnExpiry ?? true) && hasStoredSession()) {
    const fresh = await refreshSession(token)
    response = await send(url, options, fresh)
    body = response.status === 204 ? null : await readJson(response)
  }

  if (!response.ok) throw toApiError(response, body)
  return body as T
}

function client(baseUrl: string) {
  return {
    get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(baseUrl + path, options),
    post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(baseUrl + path, { ...options, method: "POST", body }),
    put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(baseUrl + path, { ...options, method: "PUT", body }),
    delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(baseUrl + path, { ...options, method: "DELETE" }),
  }
}

export const coreApi = client(CORE_API_URL)
export const chatApi = client(CHAT_API_URL)

export type ServiceName = "core" | "chat"

export type HealthResponse = {
  status: string
  db?: string
  redis?: string
}

/** GET /health of a service, through the proxy (/health/core, /health/chat). */
export function getHealth(service: ServiceName, signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>(`/health/${service}`, { signal, auth: false })
}

/** True for a failure that says nothing about the request itself: offline, proxy or server down. */
export function isServerUnavailable(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500)
}
