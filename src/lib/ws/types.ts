// WebSocket message types for /api/chat/v1/ws.
// Contract: chatty-infra/docs/events.md and api-chat.md#get-ws.

// ── Client → server ───────────────────────────────────────────────────────────

export type HeartbeatMessage = {
  type: "heartbeat"
  /** True when the tab is visible (no push notification needed). */
  visible: boolean
}

export type TypingMessage = {
  type: "typing"
  channel_id: string
}

export type WatchMessage = {
  type: "watch"
  channel_id: string
}

export type UnwatchMessage = {
  type: "unwatch"
  channel_id: string
}

export type OutboundWsMessage =
  | HeartbeatMessage
  | TypingMessage
  | WatchMessage
  | UnwatchMessage

// ── Channel event envelope ────────────────────────────────────────────────────

export type ChannelEventType =
  | "message.created"
  | "message.edited"
  | "message.deleted"
  | "reaction.added"
  | "reaction.removed"
  | "pin.added"
  | "pin.removed"

/** A storable, seq-numbered channel event. Same shape on WS, POST /sync and GET /events. */
export type ChannelEvent = {
  type: ChannelEventType
  channel_id: string
  /** Monotonic counter scoped to the channel, starting at 1. */
  seq: number
  created_at: string
  payload: Record<string, unknown>
}

// ── Server → client ───────────────────────────────────────────────────────────

/** A channel event wrapped for WebSocket delivery. */
export type EventMessage = {
  type: "event"
  event: ChannelEvent
}

export type ServerTypingMessage = {
  type: "typing"
  channel_id: string
  user_id: string
}

export type PresenceMessage = {
  type: "presence"
  team_id: string
  user_id: string
  status: "online" | "offline"
}

export type UnreadMessage = {
  type: "unread"
  channel_id: string
  /** Capped at 100 on the server (UI shows 99+). */
  unread: number
  mentions: number
}

export type ChannelUpdatedMessage = {
  type: "channel.updated"
  channel_id: string
  name: string
  topic: string | null
  archived: boolean
}

export type ServerErrorMessage = {
  type: "error"
  code: string
  message: string
}

export type InboundWsMessage =
  | EventMessage
  | ServerTypingMessage
  | PresenceMessage
  | UnreadMessage
  | ChannelUpdatedMessage
  | ServerErrorMessage
