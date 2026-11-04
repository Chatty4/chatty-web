// Pure decisions behind the resync rules (chatty-infra/docs/events.md#client-rules).
// The provider does the I/O; everything that can be wrong about ordering lives here.

import type { SyncCursors, SyncResponse } from "@/features/ws"

import type { MessagesAction, MessagesState } from "./channel-reducer"

export type EventDisposition = "duplicate" | "next" | "gap"

/** Where an incoming event's seq stands relative to the last one applied. */
export function classifyEvent(seq: number, lastSeq: number): EventDisposition {
  if (seq <= lastSeq) return "duplicate"
  return seq === lastSeq + 1 ? "next" : "gap"
}

/** POST /sync cursors: every loaded channel, including empty ones at seq 0. */
export function selectCursors(state: MessagesState): SyncCursors {
  const cursors: SyncCursors = {}
  for (const [channelId, channel] of Object.entries(state)) {
    if (!channel.loading) cursors[channelId] = channel.lastSeq
  }
  return cursors
}

export type SyncPlan = {
  /** Apply these right away, in order. */
  actions: MessagesAction[]
  /** gap_too_large: these channels must be reloaded from history. */
  reload: string[]
}

/** Turns a POST /sync response into store actions and the channels to reload. */
export function planSync(response: SyncResponse, currentUserId: string): SyncPlan {
  const plan: SyncPlan = { actions: [], reload: [] }
  for (const [channelId, result] of Object.entries(response.channels)) {
    if ("error" in result) {
      plan.actions.push({ type: "DROP_CHANNEL", channelId })
    } else if (result.gap_too_large) {
      plan.reload.push(channelId)
    } else {
      plan.actions.push({
        type: "APPLY_EVENTS",
        channelId,
        events: result.events,
        lastSeq: result.last_seq,
        currentUserId,
      })
    }
  }
  return plan
}
