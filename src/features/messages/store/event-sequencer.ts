// Applies live events by the rules in chatty-infra/docs/events.md#client-rules.
// Plain code with injected I/O, so the ordering can be tested without a socket or React.

import { ApiError } from "@/lib/api"
import type { ChannelEvent } from "@/lib/ws/types"

import type { ChannelState, GetEventsResponse } from "../types"
import type { MessagesAction } from "./channel-reducer"
import { classifyEvent } from "./sequence"

export type EventSequencerDeps = {
  getChannel: (channelId: string) => ChannelState | undefined
  getUserId: () => string | undefined
  dispatch: (action: MessagesAction) => void
  getEvents: (channelId: string, afterSeq: number) => Promise<GetEventsResponse>
  /** Reloads the channel from history. Must not reject. */
  reload: (channelId: string) => Promise<void>
}

export type EventSequencer = {
  /** Handles one live event: drops duplicates, applies the next one, fills gaps. */
  receive: (event: ChannelEvent) => void
  /** Replays events held while the channel was loading. */
  release: (channelId: string) => void
}

export function createEventSequencer(deps: EventSequencerDeps): EventSequencer {
  /** Channels with a gap fill running. */
  const filling = new Set<string>()
  /** Events that can't be judged yet: their channel is loading or filling a gap. */
  const held = new Map<string, ChannelEvent[]>()

  function hold(event: ChannelEvent) {
    const events = held.get(event.channel_id)
    if (events) events.push(event)
    else held.set(event.channel_id, [event])
  }

  function take(channelId: string): ChannelEvent[] {
    const events = held.get(channelId) ?? []
    held.delete(channelId)
    return events
  }

  async function fetchMissing(channelId: string, afterSeq: number, userId: string) {
    const events: ChannelEvent[] = []
    let cursor = afterSeq
    for (;;) {
      const page = await deps.getEvents(channelId, cursor)
      events.push(...page.events)
      if (!page.has_more) {
        deps.dispatch({
          type: "APPLY_EVENTS",
          channelId,
          events,
          lastSeq: page.last_seq,
          currentUserId: userId,
        })
        return
      }
      // Not page.last_seq: that is the channel's newest seq, past what this page returned.
      const lastInPage = page.events.at(-1)?.seq
      if (lastInPage === undefined) throw new Error("has_more with an empty page")
      cursor = lastInPage
    }
  }

  async function fillGap(channelId: string, afterSeq: number, userId: string) {
    filling.add(channelId)
    try {
      await fetchMissing(channelId, afterSeq, userId)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) await deps.reload(channelId)
    }
    filling.delete(channelId)

    // No progress means the fill failed: drop what's held, the next event starts over.
    // Replaying would just fill again in a tight loop.
    const channel = deps.getChannel(channelId)
    if (!channel || channel.lastSeq === afterSeq) {
      take(channelId)
      return
    }
    take(channelId).forEach(receive)
  }

  function receive(event: ChannelEvent) {
    const userId = deps.getUserId()
    if (!userId) return
    const channel = deps.getChannel(event.channel_id)
    if (!channel) return // never opened: it loads from history

    if (channel.loading || filling.has(event.channel_id)) {
      hold(event)
      return
    }

    switch (classifyEvent(event.seq, channel.lastSeq)) {
      case "duplicate":
        return
      case "next":
        deps.dispatch({
          type: "APPLY_EVENT",
          channelId: event.channel_id,
          event,
          currentUserId: userId,
        })
        return
      case "gap":
        hold(event)
        void fillGap(event.channel_id, channel.lastSeq, userId)
    }
  }

  return {
    receive,
    release: (channelId) => take(channelId).forEach(receive),
  }
}
