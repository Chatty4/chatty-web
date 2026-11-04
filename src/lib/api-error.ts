/** The error body every endpoint returns: {"error": {"code", "message", "fields"?}}. */
type ErrorBody = {
  error?: { code?: unknown; message?: unknown; fields?: unknown }
}

/** A failed request. `status` is 0 when the server could not be reached. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: Record<string, string>
  /** Seconds from the Retry-After header of a 429, if any. */
  readonly retryAfter?: number

  constructor(
    status: number,
    code: string,
    message: string,
    options: { fields?: Record<string, string>; retryAfter?: number } = {},
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.fields = options.fields ?? {}
    this.retryAfter = options.retryAfter
  }
}

export function networkError(): ApiError {
  return new ApiError(0, "network_error", "The server could not be reached")
}

function stringRecord(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) return {}
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  )
}

function retryAfterSeconds(response: Response): number | undefined {
  const seconds = Number(response.headers.get("Retry-After"))
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined
}

/** Build the ApiError for a non-2xx response from its (already parsed) body. */
export function toApiError(response: Response, body: unknown): ApiError {
  const error = (body as ErrorBody | null)?.error
  const code = typeof error?.code === "string" ? error.code : `http_${response.status}`
  const message = typeof error?.message === "string" ? error.message : response.statusText
  return new ApiError(response.status, code, message, {
    fields: stringRecord(error?.fields),
    retryAfter: retryAfterSeconds(response),
  })
}

/**
 * True when the server turned the session down: a rejected token or a deactivated user.
 * Anything else (429, 5xx, offline) says nothing about the session, so it must survive.
 */
export function isSessionRejected(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403)
}

/** The response body as JSON, or null when it is empty or not JSON (a proxy error page). */
export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}
