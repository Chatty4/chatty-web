import { describe, expect, it } from "vitest"

import { shouldWatch } from "./watch"

const READABLE_NOT_JOINED = { isMember: false, sidebarLoaded: true, historyLoaded: true }

describe("shouldWatch", () => {
  it("watches a channel I can read but haven't joined", () => {
    expect(shouldWatch(READABLE_NOT_JOINED)).toBe(true)
  })

  it("doesn't watch a channel I'm a member of: its events come anyway", () => {
    expect(shouldWatch({ ...READABLE_NOT_JOINED, isMember: true })).toBe(false)
  })

  it("waits for the sidebar: before it loads, every channel looks unjoined", () => {
    expect(shouldWatch({ ...READABLE_NOT_JOINED, sidebarLoaded: false })).toBe(false)
  })

  it("doesn't watch a channel whose history didn't load (private, or not loaded yet)", () => {
    expect(shouldWatch({ ...READABLE_NOT_JOINED, historyLoaded: false })).toBe(false)
  })
})
