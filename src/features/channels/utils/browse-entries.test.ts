import { describe, expect, it } from "vitest"

import type { BrowsableChannel, SidebarChannel } from "../types"
import { memberCountLabel, mergeBrowseEntries } from "./browse-entries"

function unjoined(id: string, name: string): BrowsableChannel {
  return { id, name, topic: null, member_count: 7, archived: false }
}

function joined(id: string, name: string | null, overrides: Partial<SidebarChannel> = {}): SidebarChannel {
  return {
    id,
    kind: "public",
    name,
    topic: null,
    is_default: false,
    archived: false,
    dm_member_ids: null,
    my: { role: "member", notify_level: "all", muted: false, hidden: false },
    ...overrides,
  }
}

const names = (entries: { name: string }[]) => entries.map((e) => e.name)

it("memberCountLabel handles the singular", () => {
  expect(memberCountLabel(1)).toBe("1 member")
  expect(memberCountLabel(7)).toBe("7 members")
})

describe("mergeBrowseEntries", () => {
  it("lists joined and unjoined channels together, A to Z", () => {
    const entries = mergeBrowseEntries(
      [unjoined("1", "releases"), unjoined("2", "design")],
      [joined("3", "general")],
      "",
    )
    expect(names(entries)).toEqual(["design", "general", "releases"])
  })

  it("marks which ones I'm in and keeps the member count of the others", () => {
    const [general, releases] = mergeBrowseEntries(
      [unjoined("1", "releases")],
      [joined("2", "general", { is_default: true })],
      "",
    )
    expect(general).toMatchObject({ joined: true, memberCount: null, isDefault: true })
    expect(releases).toMatchObject({ joined: false, memberCount: 7, isDefault: false })
  })

  it("includes my private channels", () => {
    const [entry] = mergeBrowseEntries([], [joined("1", "secret", { kind: "private" })], "")
    expect(entry).toMatchObject({ kind: "private", joined: true })
  })

  it("filters joined channels by name, ignoring case and spaces", () => {
    const entries = mergeBrowseEntries(
      [],
      [joined("1", "Design-Team"), joined("2", "general")],
      "  design ",
    )
    expect(names(entries)).toEqual(["Design-Team"])
  })

  it("leaves the unjoined list as the server filtered it", () => {
    expect(names(mergeBrowseEntries([unjoined("1", "releases")], [], "rel"))).toEqual(["releases"])
  })

  it("leaves out DMs", () => {
    expect(mergeBrowseEntries([], [joined("1", null, { kind: "dm" })], "")).toEqual([])
  })

  it("counts a channel in both lists as joined, once", () => {
    const entries = mergeBrowseEntries([unjoined("1", "design")], [joined("1", "design")], "")
    expect(entries).toHaveLength(1)
    expect(entries[0]!.joined).toBe(true)
  })
})
