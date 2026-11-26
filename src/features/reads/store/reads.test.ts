import { describe, expect, it } from "vitest"

import {
  applyRead,
  closeChannel,
  loadedPositions,
  openChannel,
  replaceReads,
  type ReadsState,
} from "./reads"

const none: ReadsState = {}

function loaded(positions: Record<string, number>): ReadsState {
  const reads = Object.entries(positions).map(([user_id, last_read_seq]) => ({
    user_id,
    last_read_seq,
  }))
  return replaceReads(openChannel(none, "c1"), "c1", reads)
}

describe("openChannel and closeChannel", () => {
  it("tracks a channel without positions until GET /reads answers", () => {
    const state = openChannel(none, "c1")
    expect(loadedPositions(state, "c1")).toBeNull()
  })

  it("keeps the state of a channel that is already tracked", () => {
    const state = loaded({ ana: 4 })
    expect(openChannel(state, "c1")).toBe(state)
  })

  it("forgets the channel's positions", () => {
    expect(loadedPositions(closeChannel(loaded({ ana: 4 }), "c1"), "c1")).toBeNull()
    expect(closeChannel(none, "c1")).toBe(none)
  })
})

describe("replaceReads", () => {
  it("loads the positions of every member", () => {
    expect(loadedPositions(loaded({ ana: 4, bob: 0 }), "c1")).toEqual({ ana: 4, bob: 0 })
  })

  it("replaces the members: someone who left is dropped", () => {
    const state = replaceReads(loaded({ ana: 4, bob: 2 }), "c1", [
      { user_id: "ana", last_read_seq: 4 },
    ])
    expect(loadedPositions(state, "c1")).toEqual({ ana: 4 })
  })

  it("never lowers a position that a read message raised meanwhile", () => {
    const raised = applyRead(openChannel(none, "c1"), "c1", "ana", 9)
    const state = replaceReads(raised, "c1", [{ user_id: "ana", last_read_seq: 7 }])
    expect(loadedPositions(state, "c1")).toEqual({ ana: 9 })
  })

  it("ignores an answer for a channel that was closed", () => {
    expect(replaceReads(none, "c1", [{ user_id: "ana", last_read_seq: 1 }])).toBe(none)
  })
})

describe("applyRead", () => {
  it("raises a member's position", () => {
    expect(loadedPositions(applyRead(loaded({ ana: 4 }), "c1", "ana", 6), "c1")).toEqual({
      ana: 6,
    })
  })

  it("ignores a lower or equal position", () => {
    const state = loaded({ ana: 6 })
    expect(applyRead(state, "c1", "ana", 5)).toBe(state)
    expect(applyRead(state, "c1", "ana", 6)).toBe(state)
  })

  it("adds a member it didn't know", () => {
    expect(loadedPositions(applyRead(loaded({ ana: 6 }), "c1", "bob", 2), "c1")).toEqual({
      ana: 6,
      bob: 2,
    })
  })

  it("ignores a channel that isn't tracked", () => {
    expect(applyRead(none, "c1", "ana", 3)).toBe(none)
  })
})
