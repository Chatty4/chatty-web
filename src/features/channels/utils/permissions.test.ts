import { describe, expect, it } from "vitest"

import type { ChannelDetail, MyChannelSettings } from "../types"
import {
  canAddChannelMembers,
  canLeaveChannel,
  canManageChannel,
  hasArchiveTab,
  hasNotificationsTab,
} from "./permissions"

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

describe("canLeaveChannel", () => {
  it("lets me leave a channel I'm in", () => {
    expect(canLeaveChannel(createdByMe("member"))).toBe(true)
    expect(canLeaveChannel(createdByMe("owner"))).toBe(true)
  })

  it("doesn't offer to leave a channel I only view (403 not_a_member)", () => {
    expect(canLeaveChannel({ ...createdByMe("member"), my: null })).toBe(false)
  })

  it("doesn't offer to leave a DM or the default channel", () => {
    expect(canLeaveChannel({ ...createdByMe("member"), kind: "dm" })).toBe(false)
    expect(canLeaveChannel({ ...createdByMe("member"), is_default: true })).toBe(false)
  })
})

describe("hasArchiveTab", () => {
  const viewing = { ...createdByMe("member"), my: null }

  it("has nothing to show to someone who only views and can't archive", () => {
    expect(hasArchiveTab(viewing, false)).toBe(false)
  })

  it("shows to members, to who can archive, and when there is a note to read", () => {
    expect(hasArchiveTab(createdByMe("member"), false)).toBe(true)
    expect(hasArchiveTab(viewing, true)).toBe(true)
    expect(hasArchiveTab({ ...viewing, archived: true }, false)).toBe(true)
    expect(hasArchiveTab({ ...viewing, is_default: true }, false)).toBe(true)
  })

  it("never shows for a DM", () => {
    expect(hasArchiveTab({ ...createdByMe("member"), kind: "dm" }, false)).toBe(false)
  })
})

describe("hasNotificationsTab", () => {
  it("shows for a channel I'm in, not for one I only view", () => {
    expect(hasNotificationsTab(createdByMe("member"))).toBe(true)
    expect(hasNotificationsTab({ my: null })).toBe(false)
  })
})

describe("canAddChannelMembers", () => {
  it("lets any member add people, owner or not", () => {
    expect(canAddChannelMembers(createdByMe("member"))).toBe(true)
    expect(canAddChannelMembers(createdByMe("owner"))).toBe(true)
  })

  it("refuses someone who isn't in the channel, even a team admin (403 not_a_member)", () => {
    const viewing = { ...createdByMe("member"), my: null }
    expect(canAddChannelMembers(viewing)).toBe(false)
    expect(canManageChannel(viewing, "admin")).toBe(true) // managing is a separate rule
  })

  it("refuses archived channels and DMs", () => {
    expect(canAddChannelMembers({ ...createdByMe("owner"), archived: true })).toBe(false)
    expect(canAddChannelMembers({ ...createdByMe("member"), kind: "dm" })).toBe(false)
  })
})
