import { ApiError } from "@/lib/api"

export function describeInviteError(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Try again."
  switch (error.code) {
    case "invite_limit_reached": return "This team already has 100 active invites."
    case "invite_not_found": return "Invite not found."
    case "invite_invalid": return error.message ?? "This invite is no longer valid."
    case "forbidden": return "You don't have permission to do that."
    case "not_a_team_member": return "You are not a member of this team."
    case "validation_error": return error.message ?? "Invalid input."
    default: return "Something went wrong. Try again."
  }
}
