import { describe, expect, it } from "vitest"

import type { Pin, PinsState } from "../types"
import { messagesReducer, type MessagesAction, type MessagesState } from "./channel-reducer"
import { editPin } from "./pins"
import {
  CHANNEL,
  ME,
  OTHER,
  apiMessage,
  deleted,
  edited,
  event,
  localMessage,
} from "./test-fixtures"

describe("editPin", () => {
  const edit = (body: string, editedAt: string) => ({
    message_id: "msg-1",
    body,
    mentions: [],
    edited_at: editedAt,
  })

  it("ignores an edit older than the one on the card", () => {
    const pins: PinsState = { status: "loaded", stale: false, items: [pin(1)] }
    const newer = editPin(pins, edit("second", "2026-10-05T15:00:00Z"))
    const late = editPin(newer, edit("first", "2026-10-05T14:30:00Z"))
    expect(late?.items[0]!.message.body).toBe("second")
  })
})

const pin = (seq: number, pinnedAt = "2026-10-05T14:00:00Z"): Pin => ({
  pinned_by: OTHER,
  pinned_at: pinnedAt,
  message: apiMessage(seq, { pinned: true }),
})

function state(
  pins: PinsState | undefined,
  messages = [localMessage(1), localMessage(2)],
): MessagesState {
  return {
    [CHANNEL]: {
      messages,
      lastSeq: 2,
      hasMore: false,
      loading: false,
      loadingMore: false,
      loadMoreFailed: false,
      pins,
    },
  }
}

const loaded = (items: Pin[] = []): PinsState => ({ status: "loaded", items, stale: false })
const reduce = (start: MessagesState, ...actions: MessagesAction[]) =>
  actions.reduce(messagesReducer, start)
const pinsOf = (s: MessagesState) => s[CHANNEL]!.pins!
const pinnedIds = (s: MessagesState) => pinsOf(s).items.map((item) => item.message.id)

const apply = (seqEvent: ReturnType<typeof event>): MessagesAction => ({
  type: "APPLY_EVENT",
  channelId: CHANNEL,
  event: seqEvent,
  currentUserId: ME,
})
const pinAdded = (seq: number, messageId: string, at = "2026-10-05T15:00:00Z") =>
  event("pin.added", seq, { message_id: messageId, pinned_by: OTHER, pinned_at: at })
const pinRemoved = (seq: number, messageId: string) =>
  event("pin.removed", seq, { message_id: messageId, unpinned_by: OTHER })

describe("loading the list", () => {
  it("starts loading, and keeps the current items during a refresh", () => {
    const start = state(loaded([pin(1)]))
    const next = reduce(start, { type: "PINS_LOAD_START", channelId: CHANNEL })
    expect(pinsOf(next)).toMatchObject({ status: "loading", stale: false })
    expect(pinnedIds(next)).toEqual(["msg-1"])
  })

  it("stores the answer", () => {
    const next = reduce(
      state(undefined),
      { type: "PINS_LOAD_START", channelId: CHANNEL },
      { type: "PINS_LOADED", channelId: CHANNEL, pins: [pin(2), pin(1)] },
    )
    expect(pinsOf(next).status).toBe("loaded")
    expect(pinnedIds(next)).toEqual(["msg-2", "msg-1"])
  })

  it("shows an error when there is nothing to show", () => {
    const next = reduce(
      state(undefined),
      { type: "PINS_LOAD_START", channelId: CHANNEL },
      { type: "PINS_LOAD_FAIL", channelId: CHANNEL, error: "nope" },
    )
    expect(pinsOf(next)).toMatchObject({ status: "error", error: "nope" })
  })

  it("keeps the list when only a refresh failed", () => {
    const next = reduce(
      state(loaded([pin(1)])),
      { type: "PINS_LOAD_START", channelId: CHANNEL },
      { type: "PINS_LOAD_FAIL", channelId: CHANNEL, error: "nope" },
    )
    expect(pinsOf(next).status).toBe("loaded")
    expect(pinnedIds(next)).toEqual(["msg-1"])
  })
})

describe("live events", () => {
  it("pin.added marks the message and adds it to the list, newest first", () => {
    const next = reduce(state(loaded([pin(1)])), apply(pinAdded(3, "msg-2")))
    expect(next[CHANNEL]!.messages[1]!.pinned).toBe(true)
    expect(pinnedIds(next)).toEqual(["msg-2", "msg-1"])
  })

  it("pin.added for a message that isn't loaded asks for a refetch", () => {
    const next = reduce(state(loaded()), apply(pinAdded(3, "far-up-in-history")))
    expect(pinsOf(next).stale).toBe(true)
    expect(pinnedIds(next)).toEqual([])
  })

  it("pin.removed clears the mark and removes it", () => {
    const messages = [localMessage(1, { pinned: true })]
    const next = reduce(state(loaded([pin(1)]), messages), apply(pinRemoved(3, "msg-1")))
    expect(next[CHANNEL]!.messages[0]!.pinned).toBe(false)
    expect(pinnedIds(next)).toEqual([])
  })

  it("removes a pin that isn't in the loaded messages", () => {
    const next = reduce(state(loaded([pin(99)])), apply(pinRemoved(3, "msg-99")))
    expect(pinnedIds(next)).toEqual([])
  })

  it("message.deleted removes the pin, with no pin.removed", () => {
    const next = reduce(state(loaded([pin(1)])), apply(deleted(3, "msg-1")))
    expect(pinnedIds(next)).toEqual([])
  })

  it("message.edited updates the copy in the list", () => {
    const next = reduce(
      state(loaded([pin(1)])),
      apply(edited(3, "msg-1", "new text", "2026-10-05T15:00:00Z")),
    )
    expect(pinsOf(next).items[0]!.message.body).toBe("new text")
  })

  it("a pin.added can't pin a deleted message", () => {
    const messages = [localMessage(1, { deleted_at: "2026-10-05T14:00:00Z" })]
    const next = reduce(state(loaded(), messages), apply(pinAdded(3, "msg-1")))
    expect(next[CHANNEL]!.messages[0]!.pinned).toBe(false)
    expect(pinnedIds(next)).toEqual([])
  })

  it("does nothing to the list before anything asked for it", () => {
    const next = reduce(state(undefined), apply(pinAdded(3, "msg-1")))
    expect(next[CHANNEL]!.pins).toBeUndefined()
    expect(next[CHANNEL]!.messages[0]!.pinned).toBe(true)
  })

  it("an event during a fetch asks for another fetch, as the answer may be older", () => {
    const next = reduce(
      state(loaded([pin(1)])),
      { type: "PINS_LOAD_START", channelId: CHANNEL },
      apply(pinRemoved(3, "msg-1")),
      { type: "PINS_LOADED", channelId: CHANNEL, pins: [pin(1)] },
    )
    expect(pinsOf(next).stale).toBe(true)
  })

  it("applies events from a sync batch too", () => {
    const next = reduce(state(loaded()), {
      type: "APPLY_EVENTS",
      channelId: CHANNEL,
      events: [pinAdded(3, "msg-1"), pinAdded(4, "msg-2"), pinRemoved(5, "msg-1")],
      lastSeq: 5,
      currentUserId: ME,
    })
    expect(pinnedIds(next)).toEqual(["msg-2"])
  })

  it("marks the list stale after a gap_too_large reload", () => {
    const next = reduce(state(loaded([pin(1)])), {
      type: "RELOAD",
      channelId: CHANNEL,
      messages: [apiMessage(900)],
      lastSeq: 912,
      hasMore: false,
    })
    expect(pinsOf(next).stale).toBe(true)
    expect(pinnedIds(next)).toEqual(["msg-1"])
  })
})

describe("my own pin arrives twice", () => {
  const rest: MessagesAction = {
    type: "MESSAGE_PINNED",
    channelId: CHANNEL,
    info: { message_id: "msg-1", pinned_by: ME, pinned_at: "2026-10-05T15:00:00Z" },
  }

  it("REST answer then event gives one pin", () => {
    const next = reduce(state(loaded()), rest, apply(pinAdded(3, "msg-1")))
    expect(pinnedIds(next)).toEqual(["msg-1"])
    expect(next[CHANNEL]!.messages[0]!.pinned).toBe(true)
    expect(next[CHANNEL]!.lastSeq).toBe(3)
  })

  it("event then REST answer gives one pin", () => {
    const next = reduce(state(loaded()), apply(pinAdded(3, "msg-1")), rest)
    expect(pinnedIds(next)).toEqual(["msg-1"])
  })

  it("the REST answers leave the cursor alone", () => {
    const next = reduce(state(loaded()), rest, {
      type: "MESSAGE_UNPINNED",
      channelId: CHANNEL,
      messageId: "msg-1",
    })
    expect(next[CHANNEL]!.lastSeq).toBe(2)
    expect(next[CHANNEL]!.messages[0]!.pinned).toBe(false)
    expect(pinnedIds(next)).toEqual([])
  })
})

describe("my own edit and delete", () => {
  it("update the list straight from the REST answer", () => {
    const edit = {
      message_id: "msg-1",
      body: "fixed",
      mentions: [],
      edited_at: "2026-10-05T15:00:00Z",
    }
    const editedState = reduce(state(loaded([pin(1)])), {
      type: "MESSAGE_EDITED",
      channelId: CHANNEL,
      edit,
    })
    expect(pinsOf(editedState).items[0]!.message.body).toBe("fixed")

    const deletedState = reduce(editedState, {
      type: "MESSAGE_DELETED",
      channelId: CHANNEL,
      messageId: "msg-1",
      deletedAt: "2026-10-05T15:01:00Z",
    })
    expect(pinnedIds(deletedState)).toEqual([])
  })
})
