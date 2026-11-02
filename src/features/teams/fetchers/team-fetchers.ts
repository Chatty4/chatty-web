import { coreApi } from "@/lib/api"

import type { CreateTeamResult, Role, Team, TeamListItem, TeamMember } from "../types"

export function getTeamsRequest(): Promise<{ teams: TeamListItem[] }> {
  return coreApi.get("/teams")
}

export function createTeamRequest(name: string): Promise<CreateTeamResult> {
  return coreApi.post("/teams", { name })
}

export function getTeamRequest(teamId: string): Promise<Team> {
  return coreApi.get(`/teams/${teamId}`)
}

/** PUT replaces all editable fields; pass the current icon_file_id to preserve it. */
export function updateTeamRequest(
  teamId: string,
  name: string,
  iconFileId: string | null,
): Promise<Team> {
  return coreApi.put(`/teams/${teamId}`, { name, icon_file_id: iconFileId })
}

export function deleteTeamRequest(teamId: string): Promise<void> {
  return coreApi.delete(`/teams/${teamId}`)
}

export function leaveTeamRequest(teamId: string): Promise<void> {
  return coreApi.post(`/teams/${teamId}/leave`)
}

export function getTeamMembersRequest(
  teamId: string,
): Promise<{ members: TeamMember[]; next_cursor: string | null }> {
  return coreApi.get(`/teams/${teamId}/members`)
}

export function changeRoleRequest(
  teamId: string,
  userId: string,
  role: Role,
): Promise<{ user_id: string; team_id: string; role: Role }> {
  return coreApi.put(`/teams/${teamId}/members/${userId}`, { role })
}

export function removeMemberRequest(teamId: string, userId: string): Promise<void> {
  return coreApi.delete(`/teams/${teamId}/members/${userId}`)
}
