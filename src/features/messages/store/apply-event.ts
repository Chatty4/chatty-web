// Pure function: apply one ChannelEvent to the messages array.
// Contract: chatty-infra/docs/events.md (payload shapes for each event type).

import type { ChannelEvent } from "@/lib/ws/types"
import type { ApiMessage, LocalMessage, Reaction } from "../types"

// ── Payload shapes (internal to this module) ──────────────────────────────────

type MessageCreatedPayload = { message: ApiMessage }
type MessageEditedPayload = { message_id: string; body: string; mentions: string[]; edited_at: string }
type MessageDeletedPayload = { message_id: string; deleted_by: string; deleted_at: string }
type ReactionPayload = { message_id: string; user_id: string; emoji: string }
type PinPayload = { message_id: string }

function insertSorted(messages: LocalMessage[], msg: LocalMessage): LocalMessage[] {
  // Find the last message with a real seq smaller than msg.seq (pending have seq=0)
  let i = messages.length - 1
  while (i >= 0 && (messages[i]!.seq === 0 || messages[i]!.seq > msg.seq)) i--
  const out = [...messages]
  out.splice(i + 1, 0, msg)
  return out
}

export function applyEvent(
  messages: LocalMessage[],
  event: ChannelEvent,
  currentUserId: string,
): LocalMessage[] {
  switch (event.type) {
    case "message.created": {
      const { message } = event.payload as MessageCreatedPayload
      const confirmed: LocalMessage = { ...message, status: "sent" }

      // Replace an optimistic copy if one exists (same id or same client_msg_id)
      const idx = messages.findIndex(
        (m) => m.id === message.id || (message.client_msg_id && m.client_msg_id === message.client_msg_id),
      )
      if (idx !== -1) {
        const out = [...messages]
        out[idx] = confirmed
        return out
      }

      return insertSorted(messages, confirmed)
    }

    case "message.edited": {
      const { message_id, body, mentions, edited_at } = event.payload as MessageEditedPayload
      return messages.map((m) =>
        m.id === message_id ? { ...m, body, mentions, edited_at } : m,
      )
    }

    case "message.deleted": {
      const { message_id, deleted_at } = event.payload as MessageDeletedPayload
      return messages.map((m) =>
        m.id === message_id
          ? { ...m, body: "", deleted_at, file_ids: [], attachments: [], reactions: [], pinned: false }
          : m,
      )
    }

    case "reaction.added": {
      const { message_id, user_id, emoji } = event.payload as ReactionPayload
      return messages.map((m) => {
        if (m.id !== message_id) return m
        const existing = m.reactions.find((r) => r.emoji === emoji)
        const reactions: Reaction[] = existing
          ? m.reactions.map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count + 1, me: r.me || user_id === currentUserId }
                : r,
            )
          : [...m.reactions, { emoji, count: 1, me: user_id === currentUserId }]
        return { ...m, reactions }
      })
    }

    case "reaction.removed": {
      const { message_id, user_id, emoji } = event.payload as ReactionPayload
      return messages.map((m) => {
        if (m.id !== message_id) return m
        return {
          ...m,
          reactions: m.reactions
            .map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count - 1, me: user_id === currentUserId ? false : r.me }
                : r,
            )
            .filter((r) => r.count > 0),
        }
      })
    }

    case "pin.added": {
      const { message_id } = event.payload as PinPayload
      return messages.map((m) => (m.id === message_id ? { ...m, pinned: true } : m))
    }

    case "pin.removed": {
      const { message_id } = event.payload as PinPayload
      return messages.map((m) => (m.id === message_id ? { ...m, pinned: false } : m))
    }

    default:
      return messages
  }
}
