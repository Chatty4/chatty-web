import { chatApi } from "@/lib/api"

import type { PresenceResponse } from "../types"

/** GET /teams/{id}/presence — call it after the WebSocket is open, or a change is lost. */
export function getPresenceRequest(teamId: string): Promise<PresenceResponse> {
  return chatApi.get<PresenceResponse>(`/teams/${teamId}/presence`)
}
