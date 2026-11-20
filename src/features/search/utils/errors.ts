import { ApiError } from "@/lib/api-error"
import { waitText } from "@/lib/retry-after"

/** User-facing text for a failed GET /search (api-chat.md). `more` is a "More results" page. */
export function describeSearchError(error: unknown, more = false): string {
  if (error instanceof ApiError && error.code === "rate_limited") {
    return `Too many searches. Try again in ${waitText(error.retryAfter)}.`
  }
  return more ? "Couldn't load more results." : "Couldn't search."
}
