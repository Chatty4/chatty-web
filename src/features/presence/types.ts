// Who is online in a team.
// Contract: chatty-infra/docs/api-chat.md#get-teams-team_id-presence and docs/events.md#ws-presence.

/** GET /teams/{team_id}/presence */
export type PresenceResponse = {
  team_id: string
  /** Members with at least one open WebSocket; everyone else is offline. */
  online: string[]
}
