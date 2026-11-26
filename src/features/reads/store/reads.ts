// The read positions of the open private channels and DMs (D-19). Pure: the provider holds the
// state. A position only ever goes up: GET /reads and `read` messages can arrive in any order.
// Contract: chatty-infra/docs/api-chat.md#get-channels-channel_id-reads and events.md#ws-read.

import type { MemberRead } from "../types"

/** user_id → highest last_read_seq seen. */
export type Positions = Readonly<Record<string, number>>

/** One open channel. `loaded` stays false until GET /reads answered: no ticks before that. */
export type ChannelReads = Readonly<{ loaded: boolean; positions: Positions }>

/** channel_id → its reads, for the channels on screen only. */
export type ReadsState = Readonly<Record<string, ChannelReads>>

const EMPTY: ChannelReads = { loaded: false, positions: {} }

/** Starts tracking a channel, so `read` messages count from now on. Same state if tracked. */
export function openChannel(state: ReadsState, channelId: string): ReadsState {
  return state[channelId] ? state : { ...state, [channelId]: EMPTY }
}

/** Stops tracking a channel and forgets its positions. Same state if it wasn't tracked. */
export function closeChannel(state: ReadsState, channelId: string): ReadsState {
  if (!state[channelId]) return state
  const rest = { ...state }
  delete rest[channelId]
  return rest
}

/**
 * A GET /reads answer. Its members replace the channel's (someone who left is dropped), but a
 * position never goes down: a `read` that arrived during the request is kept.
 * Ignored for a channel that isn't tracked any more.
 */
export function replaceReads(
  state: ReadsState,
  channelId: string,
  reads: readonly MemberRead[],
): ReadsState {
  const current = state[channelId]
  if (!current) return state
  const positions = Object.fromEntries(
    reads.map(({ user_id, last_read_seq }) => [
      user_id,
      Math.max(current.positions[user_id] ?? 0, last_read_seq),
    ]),
  )
  return { ...state, [channelId]: { loaded: true, positions } }
}

/** A `read` message: raises the member's position. Same state when it is not higher. */
export function applyRead(
  state: ReadsState,
  channelId: string,
  userId: string,
  lastReadSeq: number,
): ReadsState {
  const current = state[channelId]
  if (!current || lastReadSeq <= (current.positions[userId] ?? 0)) return state
  const positions = { ...current.positions, [userId]: lastReadSeq }
  return { ...state, [channelId]: { ...current, positions } }
}

/** The channel's positions once loaded, else null (show no ticks rather than wrong ones). */
export function loadedPositions(state: ReadsState, channelId: string): Positions | null {
  const channel = state[channelId]
  return channel?.loaded ? channel.positions : null
}
