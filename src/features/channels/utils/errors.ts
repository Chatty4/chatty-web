import { ApiError } from "@/lib/api"

export function describeChannelError(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Try again."
  switch (error.code) {
    case "channel_name_taken": return "A channel with that name already exists."
    case "channel_archived": return "This channel is archived."
    case "cannot_join_private": return "This is a private channel — you need an invitation."
    case "cannot_leave_dm": return "You cannot leave a DM. You can hide it instead."
    case "cannot_archive_default": return "The general channel cannot be archived."
    case "not_allowed_for_dm": return "This action is not available for direct messages."
    case "user_not_in_team": return "One or more people are not in this team."
    case "not_a_member": return "You are not a member of this channel."
    case "forbidden": return "You don't have permission to do that."
    case "validation_error": return error.message ?? "Invalid input."
    default: return "Something went wrong. Try again."
  }
}
