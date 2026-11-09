// Reducer for the per-channel message state map.
// Handles loading, pagination, event application, gap-fill and optimistic send.

import type { ChannelEvent } from "@/lib/ws/types"
import type { ApiMessage, ChannelState, LocalMessage, Pin, SendFailure } from "../types"
import { applyDelete, applyEdit, applyEvent, setPinned, type MessageEdit } from "./apply-event"
import { addPin, applyEventToPins, editPin, removePin, type PinInfo } from "./pins"

export type MessagesState = Record<string, ChannelState>

export type MessagesAction =
  | { type: "LOAD_START"; channelId: string }
  | { type: "LOAD_FAIL"; channelId: string }
  | { type: "LOAD_DONE"; channelId: string; messages: ApiMessage[]; lastSeq: number; hasMore: boolean }
  | { type: "LOAD_MORE_START"; channelId: string }
  // beforeSeq is the cursor the page was requested with; lastSeq is its answer's last_seq.
  | {
      type: "PREPEND"
      channelId: string
      messages: ApiMessage[]
      hasMore: boolean
      beforeSeq: number
      lastSeq: number
    }
  | { type: "LOAD_MORE_FAIL"; channelId: string }
  | { type: "RELOAD"; channelId: string; messages: ApiMessage[]; lastSeq: number; hasMore: boolean }
  | { type: "APPLY_EVENT"; channelId: string; event: ChannelEvent; currentUserId: string }
  | { type: "APPLY_EVENTS"; channelId: string; events: ChannelEvent[]; lastSeq: number; currentUserId: string }
  | { type: "OPTIMISTIC_ADD"; channelId: string; message: LocalMessage }
  | { type: "OPTIMISTIC_CONFIRM"; channelId: string; clientMsgId: string; confirmed: ApiMessage }
  | { type: "OPTIMISTIC_FAIL"; channelId: string; clientMsgId: string; failure: SendFailure }
  | { type: "OPTIMISTIC_DISCARD"; channelId: string; clientMsgId: string }
  | { type: "OPTIMISTIC_RETRY"; channelId: string; clientMsgId: string }
  | { type: "DROP_CHANNEL"; channelId: string }
  // REST answers to my own edit/delete. They carry no seq, so lastSeq is untouched;
  // the matching WS event applies the same values later (see applyEdit / applyDelete).
  | { type: "MESSAGE_EDITED"; channelId: string; edit: MessageEdit }
  | { type: "MESSAGE_DELETED"; channelId: string; messageId: string; deletedAt: string }
  | { type: "MESSAGE_PINNED"; channelId: string; info: PinInfo }
  | { type: "MESSAGE_UNPINNED"; channelId: string; messageId: string }
  | { type: "PINS_LOAD_START"; channelId: string }
  | { type: "PINS_LOADED"; channelId: string; pins: Pin[] }
  | { type: "PINS_LOAD_FAIL"; channelId: string; error: string }

// API returns newest-first; store keeps oldest-first for easy append.
function newestFirstToAsc(messages: ApiMessage[]): LocalMessage[] {
  return [...messages].reverse().map((m) => ({ ...m, status: "sent" as const }))
}

/** Replaces a channel with fresh history, keeping what the user hasn't managed to send. */
function makeChannelState(
  previous: ChannelState | undefined,
  messages: ApiMessage[],
  lastSeq: number,
  hasMore: boolean,
): ChannelState {
  const unsent = previous?.messages.filter((m) => m.status !== "sent") ?? []
  return {
    messages: [...newestFirstToAsc(messages), ...unsent],
    lastSeq,
    hasMore,
    loading: false,
    loadingMore: false,
    loadMoreFailed: false,
    // Events may have been skipped to get here, so the list can't be trusted any more.
    pins: previous?.pins && { ...previous.pins, stale: true },
  }
}

/** The seq to request the next older page with, or undefined with nothing from the server yet. */
export function oldestLoadedSeq(messages: LocalMessage[]): number | undefined {
  return messages.find((m) => m.seq > 0)?.seq
}

export function messagesReducer(state: MessagesState, action: MessagesAction): MessagesState {
  switch (action.type) {
    case "LOAD_START": {
      const previous = state[action.channelId]
      if (previous && !previous.loadFailed) return state
      return {
        ...state,
        [action.channelId]: {
          // A retry keeps what the user sent while the channel couldn't load.
          messages: previous?.messages ?? [],
          lastSeq: 0,
          hasMore: false,
          loading: true,
          loadingMore: false,
          loadMoreFailed: false,
        },
      }
    }

    case "LOAD_FAIL": {
      const ch = state[action.channelId]
      if (!ch) return state
      return { ...state, [action.channelId]: { ...ch, loading: false, loadFailed: true } }
    }

    case "LOAD_DONE":
      return {
        ...state,
        [action.channelId]: makeChannelState(
          state[action.channelId],
          action.messages,
          action.lastSeq,
          action.hasMore,
        ),
      }

    case "LOAD_MORE_START": {
      const ch = state[action.channelId]
      if (!ch) return state
      return {
        ...state,
        [action.channelId]: { ...ch, loadingMore: true, loadMoreFailed: false },
      }
    }

    case "LOAD_MORE_FAIL": {
      const ch = state[action.channelId]
      if (!ch) return state
      return {
        ...state,
        [action.channelId]: { ...ch, loadingMore: false, loadMoreFailed: true },
      }
    }

    case "PREPEND": {
      const ch = state[action.channelId]
      if (!ch) return state
      // A reload replaced the list while this page was in flight: it no longer joins up
      // with what's on screen, and keeping it would leave a hole in the history.
      if (oldestLoadedSeq(ch.messages) !== action.beforeSeq) {
        return { ...state, [action.channelId]: { ...ch, loadingMore: false } }
      }

      const known = new Set(ch.messages.map((m) => m.id))
      const older = newestFirstToAsc(action.messages)
        .filter((m) => !known.has(m.id))
        .map((m) => ({ ...m, asOfSeq: action.lastSeq }))
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          messages: [...older, ...ch.messages],
          // An empty page can't move the cursor, so asking again would loop forever.
          hasMore: action.hasMore && older.length > 0,
          loadingMore: false,
        },
      }
    }

    case "RELOAD":
      return {
        ...state,
        [action.channelId]: makeChannelState(
          state[action.channelId],
          action.messages,
          action.lastSeq,
          action.hasMore,
        ),
      }

    case "APPLY_EVENT": {
      const ch = state[action.channelId]
      if (!ch) return state
      if (action.event.seq <= ch.lastSeq) return state // dedup
      const messages = applyEvent(ch.messages, action.event, action.currentUserId)
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          messages,
          pins: applyEventToPins(ch.pins, action.event, messages),
          lastSeq: action.event.seq,
        },
      }
    }

    case "APPLY_EVENTS": {
      const ch = state[action.channelId]
      if (!ch) return state
      let msgs = ch.messages
      let pins = ch.pins
      let lastSeq = ch.lastSeq
      for (const event of action.events) {
        if (event.seq <= lastSeq) continue
        msgs = applyEvent(msgs, event, action.currentUserId)
        pins = applyEventToPins(pins, event, msgs)
        lastSeq = event.seq
      }
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          messages: msgs,
          pins,
          lastSeq: Math.max(lastSeq, action.lastSeq),
        },
      }
    }

    case "OPTIMISTIC_ADD": {
      const ch = state[action.channelId]
      if (!ch) return state
      return {
        ...state,
        [action.channelId]: { ...ch, messages: [...ch.messages, action.message] },
      }
    }

    case "OPTIMISTIC_CONFIRM": {
      const ch = state[action.channelId]
      if (!ch) return state
      const confirmed: LocalMessage = { ...action.confirmed, status: "sent" }
      // lastSeq stays put: only applied events move it. Jumping to this seq would turn
      // any event before it that hasn't arrived yet into a "duplicate" and lose it.
      //
      // A message.created that beat the POST response already put the message in the list,
      // maybe with later events (reactions, pins) on top. Keep that copy: this answer is older.
      // Drop only an optimistic copy that is left, which happens when the event had no
      // client_msg_id to replace it with.
      const alreadyApplied = ch.messages.some((m) => m.id === confirmed.id)
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          messages: alreadyApplied
            ? ch.messages.filter(
                (m) => !(m.client_msg_id === action.clientMsgId && m.id !== confirmed.id),
              )
            : ch.messages.map((m) => (m.client_msg_id === action.clientMsgId ? confirmed : m)),
        },
      }
    }

    case "OPTIMISTIC_FAIL": {
      const ch = state[action.channelId]
      if (!ch) return state
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          // Only a copy still waiting can fail: the message.created event may already have
          // turned it into the sent message (the server saved it, then the answer was lost).
          messages: ch.messages.map((m) =>
            m.client_msg_id === action.clientMsgId && m.status === "pending"
              ? { ...m, status: "failed" as const, failure: action.failure }
              : m,
          ),
        },
      }
    }

    case "OPTIMISTIC_DISCARD": {
      const ch = state[action.channelId]
      if (!ch) return state
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          messages: ch.messages.filter(
            (m) => !(m.client_msg_id === action.clientMsgId && m.status === "failed"),
          ),
        },
      }
    }

    case "OPTIMISTIC_RETRY": {
      const ch = state[action.channelId]
      if (!ch) return state
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          // Only a failed copy can be retried; a sent message with this id stays as it is.
          messages: ch.messages.map((m) =>
            m.client_msg_id === action.clientMsgId && m.status === "failed"
              ? { ...m, status: "pending" as const, failure: undefined }
              : m,
          ),
        },
      }
    }

    case "MESSAGE_EDITED": {
      const ch = state[action.channelId]
      if (!ch) return state
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          messages: applyEdit(ch.messages, action.edit),
          pins: editPin(ch.pins, action.edit),
        },
      }
    }

    case "MESSAGE_DELETED": {
      const ch = state[action.channelId]
      if (!ch) return state
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          messages: applyDelete(ch.messages, action.messageId, action.deletedAt),
          pins: removePin(ch.pins, action.messageId),
        },
      }
    }

    case "MESSAGE_PINNED": {
      const ch = state[action.channelId]
      if (!ch) return state
      const messages = setPinned(ch.messages, action.info.message_id, true)
      return {
        ...state,
        [action.channelId]: { ...ch, messages, pins: addPin(ch.pins, action.info, messages) },
      }
    }

    case "MESSAGE_UNPINNED": {
      const ch = state[action.channelId]
      if (!ch) return state
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          messages: setPinned(ch.messages, action.messageId, false),
          pins: removePin(ch.pins, action.messageId),
        },
      }
    }

    case "PINS_LOAD_START": {
      const ch = state[action.channelId]
      if (!ch) return state
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          pins: { status: "loading", items: ch.pins?.items ?? [], stale: false },
        },
      }
    }

    case "PINS_LOADED": {
      const ch = state[action.channelId]
      if (!ch) return state
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          pins: { status: "loaded", items: action.pins, stale: ch.pins?.stale ?? false },
        },
      }
    }

    case "PINS_LOAD_FAIL": {
      const ch = state[action.channelId]
      if (!ch) return state
      const items = ch.pins?.items ?? []
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          // A failed refresh keeps what's on screen; only an empty panel shows the error.
          pins:
            items.length > 0
              ? { status: "loaded", items, stale: false }
              : { status: "error", items, stale: false, error: action.error },
        },
      }
    }

    case "DROP_CHANNEL": {
      const next = { ...state }
      delete next[action.channelId]
      return next
    }

    default:
      return state
  }
}
