import { describe, expect, it } from "vitest"

import {
  addTyping,
  canSendTyping,
  nextHideAt,
  removeExpired,
  removeTyping,
  TYPING_HIDE_MS,
  TYPING_SEND_EVERY_MS,
  typingIn,
  typingLabel,
  type TypingState,
} from "./typing"

const nobody: TypingState = {}

describe("addTyping", () => {
  it("shows the user in that channel only", () => {
    const state = addTyping(nobody, "c1", "ana", 0)
    expect(typingIn(state, "c1")).toEqual(["ana"])
    expect(typingIn(state, "c2")).toEqual([])
  })

  it("restarts the time of a user who is already shown", () => {
    const state = addTyping(addTyping(nobody, "c1", "ana", 0), "c1", "ana", 3000)
    expect(typingIn(removeExpired(state, TYPING_HIDE_MS), "c1")).toEqual(["ana"])
    expect(typingIn(removeExpired(state, 3000 + TYPING_HIDE_MS), "c1")).toEqual([])
  })

  it("keeps the order people started in", () => {
    const both = addTyping(addTyping(nobody, "c1", "ana", 0), "c1", "bob", 0)
    expect(typingIn(addTyping(both, "c1", "ana", 1000), "c1")).toEqual(["ana", "bob"])
  })
})

describe("removeTyping", () => {
  it("removes one user and leaves the others", () => {
    const both = addTyping(addTyping(nobody, "c1", "ana", 0), "c1", "bob", 0)
    expect(typingIn(removeTyping(both, "c1", "ana"), "c1")).toEqual(["bob"])
  })

  it("leaves the same user in another channel", () => {
    const state = addTyping(addTyping(nobody, "c1", "ana", 0), "c2", "ana", 0)
    expect(typingIn(removeTyping(state, "c1", "ana"), "c2")).toEqual(["ana"])
  })

  it("keeps the same state when the user wasn't shown", () => {
    const state = addTyping(nobody, "c1", "ana", 0)
    expect(removeTyping(state, "c1", "bob")).toBe(state)
    expect(removeTyping(state, "c2", "ana")).toBe(state)
  })

  it("leaves nothing behind for an empty channel", () => {
    expect(removeTyping(addTyping(nobody, "c1", "ana", 0), "c1", "ana")).toEqual({})
  })
})

describe("removeExpired", () => {
  it("removes a user after 5 s and not before", () => {
    const state = addTyping(nobody, "c1", "ana", 0)
    expect(removeExpired(state, TYPING_HIDE_MS - 1)).toBe(state)
    expect(removeExpired(state, TYPING_HIDE_MS)).toEqual({})
  })

  it("only removes those whose time is up", () => {
    const state = addTyping(addTyping(nobody, "c1", "ana", 0), "c2", "bob", 2000)
    const left = removeExpired(state, TYPING_HIDE_MS)
    expect(typingIn(left, "c1")).toEqual([])
    expect(typingIn(left, "c2")).toEqual(["bob"])
  })
})

describe("nextHideAt", () => {
  it("is null when nobody is typing", () => {
    expect(nextHideAt(nobody)).toBeNull()
  })

  it("is the earliest time across channels", () => {
    const state = addTyping(addTyping(nobody, "c1", "ana", 2000), "c2", "bob", 0)
    expect(nextHideAt(state)).toBe(TYPING_HIDE_MS)
  })
})

describe("canSendTyping", () => {
  it("sends the first one straight away", () => {
    expect(canSendTyping(undefined, 0)).toBe(true)
  })

  it("waits until the time has passed", () => {
    expect(canSendTyping(1000, 1000 + TYPING_SEND_EVERY_MS - 1)).toBe(false)
    expect(canSendTyping(1000, 1000 + TYPING_SEND_EVERY_MS)).toBe(true)
  })

  it("never sends faster than the server's 3 s, and keeps a typing user shown", () => {
    expect(TYPING_SEND_EVERY_MS).toBeGreaterThan(3000)
    expect(TYPING_SEND_EVERY_MS).toBeLessThan(TYPING_HIDE_MS)
  })
})

describe("typingLabel", () => {
  it("is null when nobody is typing", () => {
    expect(typingLabel([])).toBeNull()
  })

  it("names one or two people", () => {
    expect(typingLabel(["Ana"])).toEqual({ names: ["Ana"], text: "is typing…" })
    expect(typingLabel(["Ana", "Bob"])).toEqual({ names: ["Ana", "Bob"], text: "are typing…" })
  })

  it("doesn't name three or more", () => {
    const several = { names: ["Several people"], text: "are typing…" }
    expect(typingLabel(["Ana", "Bob", "Cleo"])).toEqual(several)
    expect(typingLabel(["Ana", undefined, "Cleo"])).toEqual(several)
  })

  it("says someone until the names load", () => {
    const someone = { names: ["Someone"], text: "is typing…" }
    expect(typingLabel([undefined])).toEqual(someone)
    expect(typingLabel(["Ana", undefined])).toEqual(someone)
  })
})
