import { coreApi } from "@/lib/api"
import { fetchAllPages } from "@/lib/fetch-all-pages"

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

/** Every member of the team, however many pages that takes. */
export function getAllTeamMembersRequest(teamId: string): Promise<TeamMember[]> {
  return fetchAllPages(async (cursor) => {
    const params = new URLSearchParams({ limit: "200" })
    if (cursor) params.set("cursor", cursor)
    const page = await coreApi.get<{ members: TeamMember[]; next_cursor: string | null }>(
      `/teams/${teamId}/members?${params}`,
    )
    return { items: page.members, next_cursor: page.next_cursor }
  })
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
