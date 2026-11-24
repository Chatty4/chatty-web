// Who can manage a team and its members (chatty-infra/docs/api-core.md: PUT /teams/{id},
// PUT and DELETE /teams/{team_id}/members/{user_id}). The server enforces it; this only decides
// which actions the UI offers.

import type { Role } from "../types"

/** Owners and admins: the team's name and icon, and its members. */
export function isTeamManager(role: Role): boolean {
  return role === "owner" || role === "admin"
}

/**
 * Change this member's role or remove them: an owner or admin, never myself (that is leave), and
 * an admin can't touch an owner. Only an owner can remove another owner.
 */
export function canManageMember(myRole: Role, targetRole: Role, isSelf: boolean): boolean {
  if (isSelf || !isTeamManager(myRole)) return false
  return myRole === "owner" || targetRole !== "owner"
}

/**
 * Whether a member's row offers Remove, even if disabled. Never on my own row, and on an owner's
 * row only for another owner: nobody else could ever remove them.
 */
export function offersRemove(myRole: Role, targetRole: Role, isSelf: boolean): boolean {
  return !isSelf && (myRole === "owner" || targetRole !== "owner")
}
