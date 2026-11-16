// Contract: chatty-infra/docs/api-chat.md#get-search.

import type { ApiMessage } from "@/features/messages"

export type SearchResult = {
  message: ApiMessage
  /** HTML: the text is escaped by the server, only <mark> around found words is real. */
  highlight: string
}

export type SearchResponse = {
  results: SearchResult[]
  /** null on the last page. */
  next_cursor: string | null
}
