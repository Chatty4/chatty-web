const BASE_MS = 1_000
const MAX_MS = 30_000

/**
 * Delay in ms before the nth reconnect attempt (0-indexed).
 * Full jitter: uniform in [0, min(BASE * 2^attempt, MAX)].
 * Ref: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */
export function backoffDelay(attempt: number): number {
  const cap = Math.min(BASE_MS * Math.pow(2, attempt), MAX_MS)
  return Math.random() * cap
}
