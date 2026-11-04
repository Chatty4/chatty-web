// Types for the message store.
// Contract: chatty-infra/docs/api-chat.md (message object, GET /channels/{id}/messages,
// GET /channels/{id}/events, POST /channels/{id}/messages) and docs/events.md.

import type { ChannelEvent } from "@/lib/ws/types"

// ── Message shapes ────────────────────────────────────────────────────────────

export type MessageStatus = "sent" | "pending" | "failed"

export type Reaction = {
  emoji: string
  count: number
  me: boolean
}

export type Attachment = {
  file_id: string
  filename: string
  mime: string
  size: number
}

/** The message object returned by the REST API (no local-only fields). */
export type ApiMessage = {
  id: string
  channel_id: string
  /** Monotonic channel-scoped counter. 0 for pending optimistic messages. */
  seq: number
  author_id: string
  body: string
  file_ids: string[]
  attachments: Attachment[]
  mentions: string[]
  reactions: Reaction[]
  pinned: boolean
  edited_at: string | null
  deleted_at: string | null
  created_at: string
  /** Present on POST /channels/{id}/messages response and on message.created events. */
  client_msg_id?: string
}

/** A message as the store and UI see it — includes local send state. */
export type LocalMessage = ApiMessage & {
  status: MessageStatus
  /**
   * The channel's seq when this copy was fetched, for messages from an older page. Its
   * reaction counts already include events up to here, even if they arrive later.
   */
  asOfSeq?: number
}

// ── Pins ──────────────────────────────────────────────────────────────────────

/** One entry of GET /channels/{id}/pins. */
export type Pin = {
  pinned_by: string
  pinned_at: string
  message: ApiMessage
}

export type PinsState = {
  status: "loading" | "loaded" | "error"
  /** Newest pin first. Kept during a refresh so the panel doesn't flash. */
  items: Pin[]
  /** Something changed that can't be applied here: fetch the list again. */
  stale: boolean
  error?: string
}

// ── Channel state ─────────────────────────────────────────────────────────────

export type ChannelState = {
  /** Messages sorted by seq ascending; pending (seq = 0) appended at the end. */
  messages: LocalMessage[]
  /** Highest seq applied; used as cursor for POST /sync and GET /channels/{id}/events. */
  lastSeq: number
  /** True when older history exists above the loaded window. */
  hasMore: boolean
  /** True while the initial page is being fetched. */
  loading: boolean
  /** The initial page failed: the list shows an error, and nothing here can be synced. */
  loadFailed?: boolean
  /** True while an older page is being fetched; blocks further fetches. */
  loadingMore: boolean
  /** The last older page failed. Stops automatic fetches until the user retries. */
  loadMoreFailed: boolean
  /** The channel's pins, once something asked for them. */
  pins?: PinsState
}

// ── API response shapes ───────────────────────────────────────────────────────

export type GetMessagesResponse = {
  messages: ApiMessage[]
  has_more: boolean
  /** The channel's newest event number; used as the initial lastSeq cursor. */
  last_seq: number
}

export type GetEventsResponse = {
  events: ChannelEvent[]
  last_seq: number
  has_more: boolean
}

export type SendMessageResponse = ApiMessage

export type GetPinsResponse = {
  pins: Pin[]
}

export type PinMessageResponse = {
  channel_id: string
  message_id: string
  pinned_by: string
  pinned_at: string
}
