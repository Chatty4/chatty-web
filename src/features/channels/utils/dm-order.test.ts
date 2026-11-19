import { describe, expect, it } from "vitest"

import type { SidebarChannel } from "../types"
import { laterTime, sortDmsByActivity } from "./dm-order"

const dm = (id: string) => ({ id }) as SidebarChannel

describe("sortDmsByActivity", () => {
  it("puts the newest message first and DMs without one last, in their order", () => {
    const sorted = sortDmsByActivity([dm("a"), dm("b"), dm("c"), dm("d")], {
      b: "2026-11-19T10:00:00Z",
      d: "2026-11-19T12:00:00Z",
    })
    expect(sorted.map((d) => d.id)).toEqual(["d", "b", "a", "c"])
  })
})

describe("laterTime", () => {
  it("keeps the later time", () => {
    expect(laterTime("2026-11-19T12:00:00Z", "2026-11-19T10:00:00Z")).toBe("2026-11-19T12:00:00Z")
    expect(laterTime("2026-11-19T10:00:00Z", "2026-11-19T12:00:00Z")).toBe("2026-11-19T12:00:00Z")
    expect(laterTime(undefined, "2026-11-19T10:00:00Z")).toBe("2026-11-19T10:00:00Z")
  })
})
