import { describe, expect, it } from "vitest"

import { classifyEvent, planSync, selectCursors } from "./sequence"
import { CHANNEL, ME, created, localMessage } from "./test-fixtures"

describe("classifyEvent", () => {
  it.each([
    [4, 5, "duplicate"],
    [5, 5, "duplicate"],
    [6, 5, "next"],
    [7, 5, "gap"],
    [1, 0, "next"],
  ] as const)("seq %i after last_seen %i is %s", (seq, lastSeq, expected) => {
    expect(classifyEvent(seq, lastSeq)).toBe(expected)
  })
})

describe("selectCursors", () => {
  it("leaves out a channel whose history failed to load", () => {
    const failed = { ...channel(0), loadFailed: true }
    expect(selectCursors({ [CHANNEL]: failed })).toEqual({})
  })

  const channel = (lastSeq: number, loading = false) => ({
    messages: [localMessage(1)],
    lastSeq,
    hasMore: false,
    loading,
    loadingMore: false,
    loadMoreFailed: false,
  })

  it("includes every loaded channel, even an empty one at seq 0", () => {
    expect(selectCursors({ a: channel(12), empty: channel(0) })).toEqual({ a: 12, empty: 0 })
  })

  it("leaves out a channel that is still loading", () => {
    expect(selectCursors({ loading: channel(0, true) })).toEqual({})
  })
})

describe("planSync", () => {
  it("applies normal channels and asks to reload gap_too_large ones", () => {
    const plan = planSync(
      {
        channels: {
          [CHANNEL]: { events: [created(4)], last_seq: 4, gap_too_large: false },
          big: { events: [], last_seq: 912, gap_too_large: true },
        },
      },
      ME,
    )

    expect(plan.actions).toEqual([
      {
        type: "APPLY_EVENTS",
        channelId: CHANNEL,
        events: [created(4)],
        lastSeq: 4,
        currentUserId: ME,
      },
    ])
    expect(plan.reload).toEqual(["big"])
  })

  it.each(["cannot_read_channel", "channel_not_found"] as const)("drops a channel on %s", (error) => {
    const plan = planSync({ channels: { gone: { error } } }, ME)
    expect(plan.actions).toEqual([{ type: "DROP_CHANNEL", channelId: "gone" }])
    expect(plan.reload).toEqual([])
  })
})
