const BASE_MS = 1_000
const MAX_MS = 30_000

/**
 * Close codes that can reconnect right away: the token expired (4001) or a heartbeat
 * was missed (4002), so the server is healthy. Anything else, including 1006 for a
 * dropped network, backs off (chatty-infra/docs/events.md#ws-close).
 */
const IMMEDIATE_CODES = new Set([4001, 4002])

/**
 * Delay in ms before the nth reconnect attempt (0-indexed).
 * Full jitter: uniform in [0, min(BASE * 2^attempt, MAX)].
 * Ref: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */
export function backoffDelay(attempt: number): number {
  const cap = Math.min(BASE_MS * Math.pow(2, attempt), MAX_MS)
  return Math.random() * cap
}

/** Delay in ms before reconnecting after a socket closed with `code`. */
export function reconnectDelay(code: number, attempt: number): number {
  return IMMEDIATE_CODES.has(code) ? 0 : backoffDelay(attempt)
}

type RetryOptions = {
  attempts?: number
  /** False for failures that retrying can't fix, such as a 400. */
  shouldRetry: (error: unknown) => boolean
  /** Stops retrying, for example when the provider unmounted. */
  isCancelled?: () => boolean
  wait?: (ms: number) => Promise<void>
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Runs `task`, retrying transient failures with backoff. Rejects with the last error. */
export async function retryWithBackoff<T>(
  task: () => Promise<T>,
  { attempts = 3, shouldRetry, isCancelled = () => false, wait = sleep }: RetryOptions,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await task()
    } catch (error) {
      if (attempt + 1 >= attempts || !shouldRetry(error) || isCancelled()) throw error
      await wait(backoffDelay(attempt))
    }
  }
}
