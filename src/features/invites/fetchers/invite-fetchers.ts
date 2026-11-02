import { coreApi, request } from "@/lib/api"
import { CORE_API_URL } from "@/lib/config"

import type { Invite, InviteLookup, JoinResult } from "../types"

export function getTeamInvitesRequest(teamId: string): Promise<{ invites: Invite[] }> {
  return coreApi.get(`/teams/${teamId}/invites`)
}

export function createInviteRequest(
  teamId: string,
  maxAge: number,
  maxUses: number,
): Promise<Invite> {
  return coreApi.post(`/teams/${teamId}/invites`, { max_age: maxAge, max_uses: maxUses })
}

export function revokeInviteRequest(inviteId: string): Promise<void> {
  return coreApi.delete(`/invites/${inviteId}`)
}

/** No auth — public endpoint for the invite landing page. */
export function lookupInviteRequest(code: string): Promise<InviteLookup> {
  return request<InviteLookup>(`${CORE_API_URL}/invites/${code}`, { auth: false })
}

export function joinInviteRequest(code: string): Promise<JoinResult> {
  return coreApi.post(`/invites/${code}/join`)
}
