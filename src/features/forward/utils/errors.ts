import { describeSendFailure, messageErrorCode } from "@/features/messages/utils/errors"
import type { SendFailure } from "@/features/messages/types"

/**
 * Why a forward or its comment wasn't sent, and whether Retry can help. Like any send: a 429
 * keeps its wait and can be retried, and so can a network error.
 */
export function describeForwardFailure(error: unknown, now = Date.now()): SendFailure {
  switch (messageErrorCode(error)) {
    case "message_not_found":
      // deleted, or no longer readable, after the dialog opened
      return { message: "This message can't be forwarded anymore.", retryable: false }
    case "forward_wrong_team":
      // only the same team's channels are listed, so this is a bug: say nothing more
      return { message: "Something went wrong. Try again.", retryable: false }
    default:
      return describeSendFailure(error, now)
  }
}
