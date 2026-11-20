import { ApiError, isServerUnavailable } from "@/lib/api"
import { waitText } from "@/lib/retry-after"

import type { SendFailure } from "../types"

/** Most different emoji one user can have on one message (api-chat.md, Rate limits). */
export const MAX_REACTIONS_PER_USER = 20

/** User-facing text for PUT / DELETE /messages/{id} errors (api-chat.md). */
export function describeMessageError(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Try again."
  switch (error.code) {
    case "rate_limited":
      return `You're doing that too often. Try again in ${waitText(error.retryAfter)}.`
    case "validation_error":
      return "The message must be 1–4000 characters."
    case "not_author":
      return "You can only edit your own messages."
    case "not_a_member":
      return "You are no longer a member of this channel."
    case "forbidden":
      return "You don't have permission to delete this message."
    case "message_not_found":
      return "This message no longer exists."
    case "message_deleted":
      return "This message was deleted."
    case "channel_archived":
      return "This channel is archived and read-only."
    case "invalid_file":
      return "A file can't be sent. Attach it again."
    default:
      return "Something went wrong. Try again."
  }
}

/** User-facing text for PUT / DELETE /messages/{id}/reactions/{emoji} errors. */
export function describeReactionError(error: unknown): string {
  switch (messageErrorCode(error)) {
    case "validation_error":
      return "That emoji can't be used as a reaction."
    case "reaction_limit_reached":
      return `You can add at most ${MAX_REACTIONS_PER_USER} different reactions to a message. Remove one first.`
    default:
      return describeMessageError(error)
  }
}

/** User-facing text for the pin endpoints (api-chat.md). */
export function describePinError(error: unknown): string {
  switch (messageErrorCode(error)) {
    case "pin_limit_reached":
      return "This channel already has 100 pins"
    case "cannot_read_channel":
      return "You can't read this channel."
    case "channel_not_found":
      return "This channel no longer exists."
    default:
      return describeMessageError(error)
  }
}

/** Why POST /channels/{id}/messages failed, and whether sending again can work. */
export function describeSendFailure(error: unknown): SendFailure {
  if (error instanceof ApiError && error.status === 429) {
    // the message itself is fine: it can go once the wait is over
    return {
      message: `Not sent: too many messages. Try again in ${waitText(error.retryAfter)}.`,
      retryable: true,
    }
  }
  if (error instanceof ApiError && !isServerUnavailable(error)) {
    return { message: describeMessageError(error), retryable: false }
  }
  return { message: "Not sent", retryable: true }
}

/** The API error code, or undefined for network and unknown errors. */
export function messageErrorCode(error: unknown): string | undefined {
  return error instanceof ApiError ? error.code : undefined
}
