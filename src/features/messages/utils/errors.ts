import { ApiError } from "@/lib/api"

/** User-facing text for PUT / DELETE /messages/{id} errors (api-chat.md). */
export function describeMessageError(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Try again."
  switch (error.code) {
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
    default:
      return "Something went wrong. Try again."
  }
}

/** User-facing text for PUT / DELETE /messages/{id}/reactions/{emoji} errors. */
export function describeReactionError(error: unknown): string {
  if (messageErrorCode(error) === "validation_error") return "That emoji can't be used as a reaction."
  return describeMessageError(error)
}

/** The API error code, or undefined for network and unknown errors. */
export function messageErrorCode(error: unknown): string | undefined {
  return error instanceof ApiError ? error.code : undefined
}
