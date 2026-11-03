// Reducer for the per-channel message state map.
// Handles loading, pagination, event application, gap-fill and optimistic send.

import type { ChannelEvent } from "@/lib/ws/types"
import type { ApiMessage, ChannelState, LocalMessage } from "../types"
import { applyEvent } from "./apply-event"

export type MessagesState = Record<string, ChannelState>

export type MessagesAction =
  | { type: "LOAD_START"; channelId: string }
  | { type: "LOAD_DONE"; channelId: string; messages: ApiMessage[]; lastSeq: number; hasMore: boolean }
  | { type: "PREPEND"; channelId: string; messages: ApiMessage[]; hasMore: boolean }
  | { type: "RELOAD"; channelId: string; messages: ApiMessage[]; lastSeq: number }
  | { type: "APPLY_EVENT"; channelId: string; event: ChannelEvent; currentUserId: string }
  | { type: "APPLY_EVENTS"; channelId: string; events: ChannelEvent[]; lastSeq: number; currentUserId: string }
  | { type: "OPTIMISTIC_ADD"; channelId: string; message: LocalMessage }
  | { type: "OPTIMISTIC_CONFIRM"; channelId: string; clientMsgId: string; confirmed: ApiMessage }
  | { type: "OPTIMISTIC_FAIL"; channelId: string; clientMsgId: string }
  | { type: "OPTIMISTIC_RETRY"; channelId: string; clientMsgId: string }
  | { type: "DROP_CHANNEL"; channelId: string }

// API returns newest-first; store keeps oldest-first for easy append.
function newestFirstToAsc(messages: ApiMessage[]): LocalMessage[] {
  return [...messages].reverse().map((m) => ({ ...m, status: "sent" as const }))
}

function makeChannelState(
  messages: ApiMessage[],
  lastSeq: number,
  hasMore: boolean,
): ChannelState {
  return { messages: newestFirstToAsc(messages), lastSeq, hasMore, loading: false }
}

export function messagesReducer(state: MessagesState, action: MessagesAction): MessagesState {
  switch (action.type) {
    case "LOAD_START":
      if (state[action.channelId]) return state
      return {
        ...state,
        [action.channelId]: { messages: [], lastSeq: 0, hasMore: false, loading: true },
      }

    case "LOAD_DONE":
      return {
        ...state,
        [action.channelId]: makeChannelState(action.messages, action.lastSeq, action.hasMore),
      }

    case "PREPEND": {
      const ch = state[action.channelId]
      if (!ch) return state
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          messages: [...newestFirstToAsc(action.messages), ...ch.messages],
          hasMore: action.hasMore,
          loading: false,
        },
      }
    }

    case "RELOAD":
      return {
        ...state,
        [action.channelId]: makeChannelState(action.messages, action.lastSeq, false),
      }

    case "APPLY_EVENT": {
      const ch = state[action.channelId]
      if (!ch) return state
      if (action.event.seq <= ch.lastSeq) return state // dedup
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          messages: applyEvent(ch.messages, action.event, action.currentUserId),
          lastSeq: action.event.seq,
        },
      }
    }

    case "APPLY_EVENTS": {
      const ch = state[action.channelId]
      if (!ch) return state
      let msgs = ch.messages
      let lastSeq = ch.lastSeq
      for (const event of action.events) {
        if (event.seq <= lastSeq) continue
        msgs = applyEvent(msgs, event, action.currentUserId)
        lastSeq = event.seq
      }
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          messages: msgs,
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
      // Events carry no client_msg_id, so a message.created that beat the POST
      // response is already in the list: keep it and drop the optimistic copy.
      const alreadyApplied = ch.messages.some(
        (m) => m.id === confirmed.id && m.client_msg_id !== action.clientMsgId,
      )
      return {
        ...state,
        [action.channelId]: {
          ...ch,
          messages: alreadyApplied
            ? ch.messages.filter((m) => m.client_msg_id !== action.clientMsgId)
            : ch.messages.map((m) => (m.client_msg_id === action.clientMsgId ? confirmed : m)),
          lastSeq: Math.max(ch.lastSeq, action.confirmed.seq),
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
          messages: ch.messages.map((m) =>
            m.client_msg_id === action.clientMsgId ? { ...m, status: "failed" as const } : m,
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
          messages: ch.messages.map((m) =>
            m.client_msg_id === action.clientMsgId ? { ...m, status: "pending" as const } : m,
          ),
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
