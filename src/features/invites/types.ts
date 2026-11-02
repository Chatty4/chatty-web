/** An active invite returned by GET /teams/{team_id}/invites */
export type Invite = {
  id: string
  code: string
  url: string
  created_by: string
  max_uses: number
  uses: number
  expires_at: string | null
  created_at: string
}

/** The public invite info returned by GET /invites/{code} (no auth required) */
export type InviteLookup = {
  code: string
  valid: boolean
  reason: "expired" | "revoked" | "used_up" | null
  team: {
    name: string
    icon_url: string | null
    member_count: number
  }
  expires_at: string | null
}

/** Response from POST /invites/{code}/join */
export type JoinResult = {
  team_id: string
  name: string
  role: "member"
  already_member: boolean
  channel_ids: string[]
}
