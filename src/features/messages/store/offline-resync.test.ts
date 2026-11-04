// The key scenario of CHAT-200: an offline client reconnects and ends up with exactly
// the events it missed, no duplicates. Follows docs/events.md "After a reconnect":
// sync from last_seen, apply the answer, then release the live events held back meanwhile.

import { describe, expect, it } from "vitest"

import type { SyncResponse } from "@/features/ws"
import type { ChannelEvent } from "@/lib/ws/types"

import { messagesReducer, type MessagesState } from "./channel-reducer"
import { classifyEvent, planSync, selectCursors } from "./sequence"
import {
  CHANNEL,
  ME,
  apiMessage,
  created,
  deleted,
  edited,
  pendingMessage,
} from "./test-fixtures"

/** A client that has opened the channel with messages 1–3. */
function onlineClient(): MessagesState {
  return messagesReducer(
    {},
    {
      type: "LOAD_DONE",
      channelId: CHANNEL,
      messages: [apiMessage(3), apiMessage(2), apiMessage(1)],
      lastSeq: 3,
      hasMore: false,
    },
  )
}

/** What the server answers for this client's cursor, from the channel's full event log. */
function syncAnswer(state: MessagesState, log: ChannelEvent[]): SyncResponse {
  const afterSeq = selectCursors(state)[CHANNEL]!
  return {
    channels: {
      [CHANNEL]: {
        events: log.filter((e) => e.seq > afterSeq),
        last_seq: log.at(-1)?.seq ?? afterSeq,
        gap_too_large: false,
      },
    },
  }
}

function applySync(state: MessagesState, response: SyncResponse): MessagesState {
  return planSync(response, ME).actions.reduce(messagesReducer, state)
}

/** Releases held-back live events through the same rules the provider uses. */
function releaseHeld(state: MessagesState, held: ChannelEvent[]): MessagesState {
  return held.reduce((current, event) => {
    const disposition = classifyEvent(event.seq, current[CHANNEL]!.lastSeq)
    expect(disposition).not.toBe("gap")
    return disposition === "duplicate"
      ? current
      : messagesReducer(current, {
          type: "APPLY_EVENT",
          channelId: CHANNEL,
          event,
          currentUserId: ME,
        })
  }, state)
}

const bodies = (state: MessagesState) => state[CHANNEL]!.messages.map((m) => m.body)
const seqs = (state: MessagesState) => state[CHANNEL]!.messages.map((m) => m.seq)

describe("offline client reconnects", () => {
  it("gets exactly the events it missed, with no duplicates", () => {
    const missed = [
      created(4),
      edited(5, "msg-2", "edited while offline", "2026-10-05T14:05:00Z"),
      deleted(6, "msg-1"),
      created(7),
    ]

    const state = applySync(onlineClient(), syncAnswer(onlineClient(), missed))

    expect(seqs(state)).toEqual([1, 2, 3, 4, 7])
    expect(bodies(state)).toEqual(["", "edited while offline", "message 3", "message 4", "message 7"])
    expect(state[CHANNEL]!.lastSeq).toBe(7)
  })

  it("drops live events that the sync already covered and applies the newer ones", () => {
    const missed = [created(4), created(5)]
    const heldBack = [created(5), created(6)]

    const synced = applySync(onlineClient(), syncAnswer(onlineClient(), missed))
    const state = releaseHeld(synced, heldBack)

    expect(seqs(state)).toEqual([1, 2, 3, 4, 5, 6])
    expect(state[CHANNEL]!.lastSeq).toBe(6)
  })

  it("does nothing when the same sync answer is applied twice", () => {
    const answer = syncAnswer(onlineClient(), [created(4)])
    const once = applySync(onlineClient(), answer)
    expect(applySync(once, answer)).toEqual(once)
  })

  it("does nothing when nothing was missed", () => {
    const state = onlineClient()
    expect(applySync(state, syncAnswer(state, []))[CHANNEL]).toEqual(state[CHANNEL])
  })

  it("does not lose other people's messages when I sent one while the socket was down", () => {
    // The POST still works without the socket; its seq is ahead of what this client has seen.
    const mine = apiMessage(5, { author_id: ME, body: "sent while the socket was down" })
    const sent = [
      { type: "OPTIMISTIC_ADD", channelId: CHANNEL, message: pendingMessage("c1") },
      { type: "OPTIMISTIC_CONFIRM", channelId: CHANNEL, clientMsgId: "c1", confirmed: mine },
    ] as const
    const offline = sent.reduce(messagesReducer, onlineClient())

    const missed = [created(4), created(5, { author_id: ME, body: mine.body }), created(6)]
    const state = applySync(offline, syncAnswer(offline, missed))

    expect(seqs(state)).toEqual([1, 2, 3, 4, 5, 6])
    expect(state[CHANNEL]!.lastSeq).toBe(6)
  })

  it("keeps a message that is still sending at the end", () => {
    const sending = messagesReducer(onlineClient(), {
      type: "OPTIMISTIC_ADD",
      channelId: CHANNEL,
      message: pendingMessage("c1"),
    })

    const state = applySync(sending, syncAnswer(sending, [created(4)]))

    expect(state[CHANNEL]!.messages.map((m) => m.id)).toEqual([
      "msg-1",
      "msg-2",
      "msg-3",
      "msg-4",
      "c1",
    ])
  })

  it("catches up an empty channel too", () => {
    const empty = messagesReducer(
      {},
      { type: "LOAD_DONE", channelId: CHANNEL, messages: [], lastSeq: 0, hasMore: false },
    )
    expect(selectCursors(empty)).toEqual({ [CHANNEL]: 0 })

    const state = applySync(empty, syncAnswer(empty, [created(1), created(2)]))

    expect(seqs(state)).toEqual([1, 2])
  })
})
