import { chatApi } from "@/lib/api"

import type { AttachmentSearchResponse, SearchResponse } from "../types"

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

function searchParams(
  teamId: string,
  q: string | undefined,
  filters: SearchFilters,
  cursor?: string,
): URLSearchParams {
  const params = new URLSearchParams({ team_id: teamId })
  if (q) params.set("q", q)
  for (const [name, value] of Object.entries(filters)) {
    if (value) params.set(name, value)
  }
  if (cursor) params.set("cursor", cursor)
  return params
}

/** GET /search: one team's messages, best match first. `cursor` continues the same search. */
export function searchMessages(
  teamId: string,
  q: string,
  filters: SearchFilters,
  cursor?: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = searchParams(teamId, q, filters, cursor)
  return chatApi.get<SearchResponse>(`/search?${params}`, { signal })
}

/**
 * GET /search/attachments: one team's files by name, colors, objects and text, best match first.
 * Without `q`, the newest files (with `in`, one conversation's files).
 */
export function searchAttachments(
  teamId: string,
  q: string | undefined,
  filters: SearchFilters,
  cursor?: string,
  signal?: AbortSignal,
): Promise<AttachmentSearchResponse> {
  const params = searchParams(teamId, q, filters, cursor)
  return chatApi.get<AttachmentSearchResponse>(`/search/attachments?${params}`, { signal })
}
