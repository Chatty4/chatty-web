import { describe, expect, it } from "vitest"

import type { PresenceMessage } from "@/lib/ws/types"

import { applyPresence, mergeAnswer } from "./presence"

const frame = (user_id: string, status: "online" | "offline"): PresenceMessage => ({
  type: "presence",
  team_id: "t1",
  user_id,
  status,
})

describe("applyPresence", () => {
  it("adds a user who comes online and removes one who goes offline", () => {
    const online = applyPresence(new Set(["a"]), frame("b", "online"))
    expect([...applyPresence(online, frame("a", "offline"))]).toEqual(["b"])
  })

  it("keeps the same set when nothing changed", () => {
    const online = new Set(["a"])
    expect(applyPresence(online, frame("a", "online"))).toBe(online)
    expect(applyPresence(online, frame("b", "offline"))).toBe(online)
  })
})

describe("mergeAnswer", () => {
  it("applies the messages that arrived while the answer was on its way", () => {
    const online = mergeAnswer(["a", "b"], [frame("a", "offline"), frame("c", "online")])
    expect([...online].sort()).toEqual(["b", "c"])
  })
})
