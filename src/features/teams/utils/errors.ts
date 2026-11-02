import { ApiError, isServerUnavailable } from "@/lib/api"

/** A human-readable message for a failed team operation. */
export function describeTeamError(error: unknown): string {
  if (isServerUnavailable(error) || !(error instanceof ApiError)) {
    return "Chatty can't be reached right now. Check your connection and try again."
  }
  switch (error.code) {
    case "team_limit_reached":
      return "You can't create more than 10 teams."
    case "last_owner":
      return "You're the only owner. Make someone else owner first, or delete the team."
    case "validation_error": {
      const reason = error.fields?.name
      if (reason === "too_long") return "Team name is too long (max 80 characters)."
      if (reason === "blank" || reason === "required") return "Team name is required."
      return "Some details weren't accepted. Check them and try again."
    }
    case "forbidden":
      return "You don't have permission to do this."
    case "not_a_team_member":
      return "You're no longer a member of this team."
    default:
      return "Something went wrong. Try again."
  }
}
