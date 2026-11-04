// Builders for store tests. Shapes follow chatty-infra/docs/api-chat.md and events.md.

import type { ChannelEvent, ChannelEventType } from "@/lib/ws/types"

import type { ApiMessage, LocalMessage } from "../types"

export const CHANNEL = "channel-1"
export const ME = "user-me"
export const OTHER = "user-other"

export function apiMessage(seq: number, overrides: Partial<ApiMessage> = {}): ApiMessage {
  return {
    id: `msg-${seq}`,
    channel_id: CHANNEL,
    seq,
    author_id: OTHER,
    body: `message ${seq}`,
    file_ids: [],
    attachments: [],
    mentions: [],
    reactions: [],
    pinned: false,
    edited_at: null,
    deleted_at: null,
    created_at: "2026-10-05T14:00:00Z",
    ...overrides,
  }
}

export function localMessage(seq: number, overrides: Partial<LocalMessage> = {}): LocalMessage {
  return { ...apiMessage(seq), status: "sent", ...overrides }
}

/** A message the user just sent: no server id or seq yet. */
export function pendingMessage(clientMsgId: string, body = "sending"): LocalMessage {
  return localMessage(0, {
    id: clientMsgId,
    client_msg_id: clientMsgId,
    author_id: ME,
    body,
    status: "pending",
  })
}

export function event(
  type: ChannelEventType,
  seq: number,
  payload: Record<string, unknown>,
): ChannelEvent {
  return { type, channel_id: CHANNEL, seq, created_at: "2026-10-05T14:00:00Z", payload }
}

export function created(seq: number, overrides: Partial<ApiMessage> = {}): ChannelEvent {
  return event("message.created", seq, { message: apiMessage(seq, overrides) })
}

export function edited(seq: number, messageId: string, body: string, editedAt: string): ChannelEvent {
  return event("message.edited", seq, {
    message_id: messageId,
    body,
    mentions: [],
    edited_at: editedAt,
  })
}

export function deleted(seq: number, messageId: string): ChannelEvent {
  return event("message.deleted", seq, {
    message_id: messageId,
    deleted_by: OTHER,
    deleted_at: "2026-10-05T15:00:00Z",
  })
}
