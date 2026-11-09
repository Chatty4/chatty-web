import { describe, expect, it } from "vitest"

import { createUnknownChannelTracker, RECHECK_MS } from "./unknown-channels"

function tracker() {
  let time = 1_000_000
  const tracked = createUnknownChannelTracker(() => time)
  return { tracked, advance: (ms: number) => (time += ms) }
}

const KNOWN = new Set(["general", "dm-with-ana"])

describe("unknown channel tracker", () => {
  it("never reloads for a channel the sidebar lists", () => {
    const { tracked } = tracker()
    expect(tracked.shouldReload("general", KNOWN)).toBe(false)
  })

  it("reloads for a channel the sidebar doesn't list", () => {
    const { tracked } = tracker()
    expect(tracked.shouldReload("new-dm", KNOWN)).toBe(true)
  })

  it("doesn't reload again for the same id within a minute", () => {
    // a watched public channel stays unknown: its events must not reload the sidebar each time
    const { tracked, advance } = tracker()
    tracked.shouldReload("watched", KNOWN)
    advance(RECHECK_MS - 1)
    expect(tracked.shouldReload("watched", KNOWN)).toBe(false)
  })

  it("checks a still-unknown id again after a minute", () => {
    // so being added to a channel I was only watching is noticed
    const { tracked, advance } = tracker()
    tracked.shouldReload("watched", KNOWN)
    advance(RECHECK_MS)
    expect(tracked.shouldReload("watched", KNOWN)).toBe(true)
  })

  it("checks each unknown id on its own", () => {
    const { tracked } = tracker()
    tracked.shouldReload("first", KNOWN)
    expect(tracked.shouldReload("second", KNOWN)).toBe(true)
  })

  it("forgets the checks on reset", () => {
    const { tracked } = tracker()
    tracked.shouldReload("other-team", KNOWN)
    tracked.reset()
    expect(tracked.shouldReload("other-team", KNOWN)).toBe(true)
  })
})
