import { chatApi } from "@/lib/api"

import type { MarkReadResponse, UnreadResponse } from "../types"

/** GET /unread — the counts of every channel I'm in, in one team. */
export function getUnreadRequest(teamId: string): Promise<UnreadResponse> {
  const params = new URLSearchParams({ team_id: teamId })
  return chatApi.get<UnreadResponse>(`/unread?${params}`)
}

/** POST /channels/{id}/read — moves my read position forward to `seq`. */
export function markReadRequest(channelId: string, seq: number): Promise<MarkReadResponse> {
  return chatApi.post<MarkReadResponse>(`/channels/${channelId}/read`, { seq })
}
