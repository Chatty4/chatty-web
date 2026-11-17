import { chatApi } from "@/lib/api"

import type { SearchResponse } from "../types"

/** The optional filters of GET /search; a cursor only continues the same q and filters. */
export type SearchFilters = {
  /** A channel id. */
  in?: string
  /** An author's user id. */
  from?: string
  /** ISO times with a timezone. */
  before?: string
  after?: string
}

/** GET /search: one team's messages, best match first. `cursor` continues the same search. */
export function searchMessages(
  teamId: string,
  q: string,
  filters: SearchFilters,
  cursor?: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ team_id: teamId, q })
  for (const [name, value] of Object.entries(filters)) {
    if (value) params.set(name, value)
  }
  if (cursor) params.set("cursor", cursor)
  return chatApi.get<SearchResponse>(`/search?${params}`, { signal })
}
