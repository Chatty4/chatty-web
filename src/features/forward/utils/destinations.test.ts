import { describe, expect, it } from "vitest"

import type { SidebarChannel } from "@/features/channels"

import { MAX_FORWARD_DESTINATIONS } from "../constants"
import { filterDestinations, forwardDestinations, toggleDestination } from "./destinations"

const ME = "user-me"

function sidebarChannel(id: string, overrides: Partial<SidebarChannel> = {}): SidebarChannel {
  return {
    id,
    kind: "public",
    name: id,
    topic: null,
    is_default: false,
    archived: false,
    dm_member_ids: null,
    my: { role: "member", notify_level: "all", muted: false, hidden: false },
    ...overrides,
  }
}

const general = sidebarChannel("general")
const secret = sidebarChannel("secret", { kind: "private" })
const old = sidebarChannel("old", { archived: true })
const dmWithAna = sidebarChannel("dm-1", { kind: "dm", name: null, dm_member_ids: [ME, "ana"] })

describe("forwardDestinations", () => {
  it("lists the channels I'm in, then my DMs, by name", () => {
    expect(forwardDestinations([general, secret], [dmWithAna], ME, { ana: "Ana Pop" })).toEqual([
      { id: "general", kind: "public", name: "general" },
      { id: "secret", kind: "private", name: "secret" },
      { id: "dm-1", kind: "dm", name: "Ana Pop" },
    ])
  })

  it("leaves out archived channels, where nobody can write", () => {
    const ids = forwardDestinations([general, old], [], ME, {}).map((destination) => destination.id)
    expect(ids).toEqual(["general"])
  })
})

describe("filterDestinations", () => {
  const all = forwardDestinations([general, secret], [dmWithAna], ME, { ana: "Ana Pop" })

  it("keeps the names that contain the query, ignoring case", () => {
    expect(filterDestinations(all, " ANA ").map((destination) => destination.id)).toEqual(["dm-1"])
    expect(filterDestinations(all, "e").map((destination) => destination.id)).toEqual([
      "general",
      "secret",
    ])
  })

  it("keeps everything for an empty query", () => {
    expect(filterDestinations(all, "  ")).toBe(all)
  })
})

describe("toggleDestination", () => {
  it("adds and removes a destination", () => {
    expect(toggleDestination([], "a")).toEqual(["a"])
    expect(toggleDestination(["a", "b"], "a")).toEqual(["b"])
  })

  it(`stops at ${MAX_FORWARD_DESTINATIONS}, but still removes`, () => {
    const full = ["a", "b", "c", "d", "e"].slice(0, MAX_FORWARD_DESTINATIONS)
    expect(toggleDestination(full, "f")).toBe(full)
    expect(toggleDestination(full, "a")).toHaveLength(MAX_FORWARD_DESTINATIONS - 1)
  })
})
