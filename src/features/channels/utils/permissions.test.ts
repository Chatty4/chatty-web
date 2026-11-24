import { describe, expect, it } from "vitest"

import type { ChannelDetail, MyChannelSettings } from "../types"
import { canManageChannel } from "./permissions"

const my = (role: MyChannelSettings["role"]): MyChannelSettings => ({
  role,
  notify_level: "mentions",
  muted: false,
  hidden: false,
})

const MY_USER_ID = "u-me"

/** A public channel I created, as GET /channels/{id} returns it. */
const createdByMe = (role: MyChannelSettings["role"]): ChannelDetail => ({
  id: "c1",
  team_id: "t1",
  kind: "public",
  name: "releases",
  topic: null,
  is_default: false,
  archived: false,
  member_count: 2,
  created_by: MY_USER_ID,
  created_at: "2026-11-24T12:00:00Z",
  my: my(role),
})

describe("canManageChannel", () => {
  it("lets the channel owner manage", () => {
    expect(canManageChannel({ kind: "public", my: my("owner") }, "member")).toBe(true)
  })

  it("lets a team owner or admin manage a channel they don't own", () => {
    expect(canManageChannel({ kind: "private", my: my("member") }, "admin")).toBe(true)
    expect(canManageChannel({ kind: "public", my: null }, "owner")).toBe(true)
  })

  it("refuses a plain member", () => {
    expect(canManageChannel({ kind: "public", my: my("member") }, "member")).toBe(false)
    expect(canManageChannel({ kind: "public", my: null }, null)).toBe(false)
  })

  it("goes by my role now, not by who created the channel", () => {
    // I left and joined again, so someone else owns it and I'm a plain member (403 forbidden).
    expect(canManageChannel(createdByMe("member"), "member")).toBe(false)
    expect(canManageChannel(createdByMe("owner"), "member")).toBe(true)
  })

  it("refuses everyone in a DM", () => {
    expect(canManageChannel({ kind: "dm", my: my("owner") }, "owner")).toBe(false)
    expect(canManageChannel({ kind: "dm", my: my("member") }, "admin")).toBe(false)
  })
})
