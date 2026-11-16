import { chatApi } from "@/lib/api"

import type { SearchResponse } from "../types"

/** GET /search: one team's messages, best match first. `cursor` continues the same search. */
export function searchMessages(
  teamId: string,
  q: string,
  cursor?: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ team_id: teamId, q })
  if (cursor) params.set("cursor", cursor)
  return chatApi.get<SearchResponse>(`/search?${params}`, { signal })
}
