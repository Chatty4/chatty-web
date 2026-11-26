// Contract: chatty-infra/docs/api-chat.md#get-search and #get-search-attachments.

import type { ApiMessage, Attachment } from "@/features/messages"

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

/** A file of GET /search/attachments, with the message it was sent with. */
export type AttachmentSearchResult = SearchResult & {
  attachment: Attachment
}

export type AttachmentSearchResponse = {
  results: AttachmentSearchResult[]
  /** null on the last page. */
  next_cursor: string | null
}
