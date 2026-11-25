import { describe, expect, it } from "vitest"

import type { ChannelEvent } from "@/lib/ws/types"

import {
  countNewMessage,
  formatCount,
  replaceCounts,
  selectCounts,
  setChannelCounts,
  UNREAD_CAP,
  type UnreadState,
} from "./unread"

const ME = "user-me"
const OTHER = "user-other"

/** `repliesTo`: the author of the message it replies to. */
function created(
  channelId: string,
  seq: number,
  { author = OTHER, mentions = [] as string[], repliesTo = null as string | null } = {},
): ChannelEvent {
  const reply_to = repliesTo && {
    id: "msg-0",
    seq: 0,
    author_id: repliesTo,
    body: "hi",
    deleted: false,
  }
  return {
    type: "message.created",
    channel_id: channelId,
    seq,
    created_at: "2026-10-05T14:00:00Z",
    payload: { message: { author_id: author, mentions, reply_to } },
  }
}

const loaded = (unread = 0, mentions = 0): UnreadState =>
  replaceCounts({}, [{ channel_id: "a", unread, mentions }])

describe("replaceCounts", () => {
  it("drops channels that are no longer in the answer", () => {
    const state = replaceCounts(loaded(3), [{ channel_id: "b", unread: 1, mentions: 0 }])
    expect(selectCounts(state, "a")).toEqual({ unread: 0, mentions: 0 })
    expect(selectCounts(state, "b")).toEqual({ unread: 1, mentions: 0 })
  })

  it("keeps the counted seq, so a replayed event isn't counted again", () => {
    const counted = countNewMessage(loaded(), created("a", 5), ME)
    const refreshed = replaceCounts(counted, [{ channel_id: "a", unread: 1, mentions: 0 }])
    expect(countNewMessage(refreshed, created("a", 5), ME)).toBe(refreshed)
  })
})

describe("setChannelCounts", () => {
  it("takes the server's counts", () => {
    const state = setChannelCounts(loaded(7, 2), { channel_id: "a", unread: 0, mentions: 0 })
    expect(selectCounts(state, "a")).toEqual({ unread: 0, mentions: 0 })
  })

  it("keeps the same object when nothing changed", () => {
    const state = loaded(2)
    expect(setChannelCounts(state, { channel_id: "a", unread: 2, mentions: 0 })).toBe(state)
  })
})

describe("formatCount", () => {
  it("shows 99+ from the cap on", () => {
    expect(formatCount(99)).toBe("99")
    expect(formatCount(UNREAD_CAP)).toBe("99+")
  })
})

describe("countNewMessage", () => {
  it("adds one for a message from someone else", () => {
    expect(selectCounts(countNewMessage(loaded(1), created("a", 1), ME), "a")).toEqual({
      unread: 2,
      mentions: 0,
    })
  })

  it("adds a mention when the message mentions me", () => {
    const state = countNewMessage(loaded(), created("a", 1, { mentions: [ME] }), ME)
    expect(selectCounts(state, "a")).toEqual({ unread: 1, mentions: 1 })
  })

  it("adds a mention when the message replies to one of mine", () => {
    const state = countNewMessage(loaded(), created("a", 1, { repliesTo: ME }), ME)
    expect(selectCounts(state, "a")).toEqual({ unread: 1, mentions: 1 })
  })

  it("adds one mention for a reply to me that also mentions me", () => {
    const state = countNewMessage(loaded(), created("a", 1, { repliesTo: ME, mentions: [ME] }), ME)
    expect(selectCounts(state, "a")).toEqual({ unread: 1, mentions: 1 })
  })

  it("doesn't count a reply to someone else as a mention", () => {
    const state = countNewMessage(loaded(), created("a", 1, { repliesTo: OTHER }), ME)
    expect(selectCounts(state, "a")).toEqual({ unread: 1, mentions: 0 })
  })

  it("doesn't count my own messages", () => {
    const state = countNewMessage(loaded(), created("a", 1, { author: ME }), ME)
    expect(selectCounts(state, "a")).toEqual({ unread: 0, mentions: 0 })
  })

  it("counts a duplicate event once", () => {
    const once = countNewMessage(loaded(), created("a", 1), ME)
    expect(countNewMessage(once, created("a", 1), ME)).toBe(once)
  })

  it("stops at the cap", () => {
    const state = countNewMessage(loaded(UNREAD_CAP, UNREAD_CAP), created("a", 1, { mentions: [ME] }), ME)
    expect(selectCounts(state, "a")).toEqual({ unread: UNREAD_CAP, mentions: UNREAD_CAP })
  })

  it("skips channels that aren't loaded, such as another team's", () => {
    const state = loaded()
    expect(countNewMessage(state, created("other-team", 1), ME)).toBe(state)
  })

  it("ignores events that aren't new messages", () => {
    const state = loaded()
    expect(countNewMessage(state, { ...created("a", 1), type: "message.deleted" }, ME)).toBe(state)
  })
})
