// Unread counts per channel, kept as plain functions so the provider only wires them up.
// The server sends `unread` only after a read, so new messages are counted here
// (chatty-infra/docs/events.md#ws-unread). GET /unread replaces everything after a
// reconnect or a team switch, which fixes any drift.

import type { ApiMessage } from "@/features/messages"
import type { ChannelEvent } from "@/lib/ws/types"

import type { ChannelUnread, UnreadCounts } from "../types"

/** The server stops counting here; the UI shows 99+. */
export const UNREAD_CAP = 100

type Entry = UnreadCounts & {
  /** The highest message seq counted here, so a replayed event isn't counted twice. */
  countedSeq: number
}

/** channel_id → counts */
export type UnreadState = Record<string, Entry>

type MessageCreatedPayload = { message: Pick<ApiMessage, "author_id" | "mentions"> }

export const EMPTY_COUNTS: UnreadCounts = { unread: 0, mentions: 0 }

/** GET /unread: its channels replace the old ones. */
export function replaceCounts(state: UnreadState, rows: ChannelUnread[]): UnreadState {
  const next: UnreadState = {}
  for (const row of rows) {
    next[row.channel_id] = {
      unread: row.unread,
      mentions: row.mentions,
      countedSeq: state[row.channel_id]?.countedSeq ?? 0,
    }
  }
  return next
}

/** An `unread` message or a POST /read answer: the server's counts for one channel. */
export function setChannelCounts(state: UnreadState, row: ChannelUnread): UnreadState {
  const current = state[row.channel_id]
  if (current && current.unread === row.unread && current.mentions === row.mentions) return state
  return {
    ...state,
    [row.channel_id]: {
      unread: row.unread,
      mentions: row.mentions,
      countedSeq: current?.countedSeq ?? 0,
    },
  }
}

/**
 * A live `message.created` from someone else adds one, and one mention if it mentions me.
 * Channels of another team aren't in the state and are skipped.
 */
export function countNewMessage(
  state: UnreadState,
  event: ChannelEvent,
  myUserId: string,
): UnreadState {
  if (event.type !== "message.created") return state
  const current = state[event.channel_id]
  if (!current || event.seq <= current.countedSeq) return state

  const { message } = event.payload as MessageCreatedPayload
  if (message.author_id === myUserId) {
    return { ...state, [event.channel_id]: { ...current, countedSeq: event.seq } }
  }

  const mentionsMe = message.mentions.includes(myUserId)
  return {
    ...state,
    [event.channel_id]: {
      unread: Math.min(current.unread + 1, UNREAD_CAP),
      mentions: mentionsMe ? Math.min(current.mentions + 1, UNREAD_CAP) : current.mentions,
      countedSeq: event.seq,
    },
  }
}

/** The counts of one channel; a channel not loaded yet has none. */
export function selectCounts(state: UnreadState, channelId: string): UnreadCounts {
  const entry = state[channelId]
  return entry ? { unread: entry.unread, mentions: entry.mentions } : EMPTY_COUNTS
}
