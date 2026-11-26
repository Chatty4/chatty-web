import { chatApi } from "@/lib/api"

import type { ChannelReadsResponse } from "../types"

/** GET /channels/{id}/reads — every member's read position in a private channel or DM. */
export function getChannelReadsRequest(channelId: string): Promise<ChannelReadsResponse> {
  return chatApi.get<ChannelReadsResponse>(`/channels/${channelId}/reads`)
}
