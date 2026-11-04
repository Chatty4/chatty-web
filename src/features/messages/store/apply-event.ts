// Pure function: apply one ChannelEvent to the messages array.
// Contract: chatty-infra/docs/events.md (payload shapes for each event type).

import type { ChannelEvent } from "@/lib/ws/types"
import type { ApiMessage, LocalMessage, Reaction } from "../types"

// ── Payload shapes (internal to this module) ──────────────────────────────────

type MessageCreatedPayload = { message: ApiMessage }
type MessageDeletedPayload = { message_id: string; deleted_by: string; deleted_at: string }
type ReactionPayload = { message_id: string; user_id: string; emoji: string }
type PinPayload = { message_id: string }

export type MessageEdit = { message_id: string; body: string; mentions: string[]; edited_at: string }

/**
 * Applies an edit from a message.edited event or a PUT response. Both can arrive for
 * the same edit in either order, so this is idempotent: deleted messages and edits
 * older than the one already shown are ignored.
 */
export function applyEdit(messages: LocalMessage[], edit: MessageEdit): LocalMessage[] {
  return messages.map((m) => {
    if (m.id !== edit.message_id || m.deleted_at !== null) return m
    if (m.edited_at && Date.parse(m.edited_at) > Date.parse(edit.edited_at)) return m
    return { ...m, body: edit.body, mentions: edit.mentions, edited_at: edit.edited_at }
  })
}

/** Turns a message into the deleted placeholder. Idempotent: a second delete is a no-op. */
export function applyDelete(
  messages: LocalMessage[],
  messageId: string,
  deletedAt: string,
): LocalMessage[] {
  return messages.map((m) =>
    m.id === messageId && m.deleted_at === null
      ? { ...m, body: "", deleted_at: deletedAt, file_ids: [], attachments: [], mentions: [], reactions: [], pinned: false }
      : m,
  )
}

/** Sets the pin mark. Safe to apply twice; a deleted message can't be pinned. */
export function setPinned(
  messages: LocalMessage[],
  messageId: string,
  pinned: boolean,
): LocalMessage[] {
  return messages.map((m) => (m.id === messageId && m.deleted_at === null ? { ...m, pinned } : m))
}

/**
 * Reaction events move a count, so unlike edits they aren't safe to apply twice.
 * Skip deleted messages, and events the message's copy already includes.
 */
function acceptsReaction(message: LocalMessage, eventSeq: number): boolean {
  return message.deleted_at === null && eventSeq > (message.asOfSeq ?? 0)
}

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

      // Already here from the POST answer or a replay: a created event has nothing newer,
      // and applying it would undo a later edit or delete.
      if (messages.some((m) => m.id === message.id)) return messages

      const idx = message.client_msg_id
        ? messages.findIndex((m) => m.client_msg_id === message.client_msg_id)
        : -1
      if (idx !== -1) {
        const out = [...messages]
        out[idx] = confirmed
        return out
      }

      return insertSorted(messages, confirmed)
    }

    case "message.edited":
      return applyEdit(messages, event.payload as MessageEdit)

    case "message.deleted": {
      const { message_id, deleted_at } = event.payload as MessageDeletedPayload
      return applyDelete(messages, message_id, deleted_at)
    }

    case "reaction.added": {
      const { message_id, user_id, emoji } = event.payload as ReactionPayload
      return messages.map((m) => {
        if (m.id !== message_id || !acceptsReaction(m, event.seq)) return m
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
        if (m.id !== message_id || !acceptsReaction(m, event.seq)) return m
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
      return setPinned(messages, message_id, true)
    }

    case "pin.removed": {
      const { message_id } = event.payload as PinPayload
      return setPinned(messages, message_id, false)
    }

    default:
      return messages
  }
}
