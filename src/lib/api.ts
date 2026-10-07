// API client stub for chatty-core and chatty-chat.
// Real endpoints are added per feature (e.g. `coreApi.post("/auth/login", body)`).
// Contracts: chatty-infra/docs/api-core.md and api-chat.md.

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL ?? "/api/core/v1"
const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL ?? "/api/chat/v1"

/** The error body every endpoint returns: {"error": {"code", "message", "fields"?}}. */
type ErrorBody = {
  error?: { code?: string; message?: string; fields?: Record<string, string> }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.fields = fields
  }
}

// The access token lives in memory only. Login, refresh and logout set it later.
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
  signal?: AbortSignal
}

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (options.body !== undefined) headers["Content-Type"] = "application/json"
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch {
    throw new ApiError(0, "network_error", "The server could not be reached")
  }

  if (response.status === 204) return undefined as T

  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = (data as ErrorBody | null)?.error
    throw new ApiError(
      response.status,
      error?.code ?? "unknown_error",
      error?.message ?? response.statusText,
      error?.fields,
    )
  }
  return data as T
}

function client(baseUrl: string) {
  return {
    get: <T>(path: string, signal?: AbortSignal) => request<T>(baseUrl + path, { signal }),
    post: <T>(path: string, body?: unknown) =>
      request<T>(baseUrl + path, { method: "POST", body }),
    put: <T>(path: string, body?: unknown) => request<T>(baseUrl + path, { method: "PUT", body }),
    delete: <T>(path: string) => request<T>(baseUrl + path, { method: "DELETE" }),
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
  return request<HealthResponse>(`/health/${service}`, { signal })
}
