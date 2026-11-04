import { describe, expect, it } from "vitest"

import { ME, OTHER, localMessage, pendingMessage } from "../store/test-fixtures"
import { canDelete, canEdit, canReact, type Actor, type ChannelAccess } from "./permissions"

const member: Actor = { userId: ME, teamRole: "member" }
const admin: Actor = { userId: ME, teamRole: "admin" }
const open: ChannelAccess = { kind: "public", archived: false, myRole: "member" }
const archived: ChannelAccess = { ...open, archived: true }
const dm: ChannelAccess = { ...open, kind: "dm" }

const mine = localMessage(1, { author_id: ME })
const theirs = localMessage(2, { author_id: OTHER })
const deleted = localMessage(3, { deleted_at: "2026-10-05T14:10:00Z" })

describe("canReact", () => {
  it("allows anyone who can write, on anyone's message", () => {
    expect(canReact(mine, open)).toBe(true)
    expect(canReact(theirs, open)).toBe(true)
    expect(canReact(theirs, dm)).toBe(true)
  })

  it("is off in archived channels and when I'm not in the channel", () => {
    expect(canReact(theirs, archived)).toBe(false)
    expect(canReact(theirs, null)).toBe(false)
  })

  it("is off on deleted, pending and failed messages", () => {
    expect(canReact(deleted, open)).toBe(false)
    expect(canReact(pendingMessage("c1"), open)).toBe(false)
    expect(canReact({ ...pendingMessage("c1"), status: "failed" }, open)).toBe(false)
  })
})

describe("canEdit", () => {
  it("is only for my own message in a channel I can write in", () => {
    expect(canEdit(mine, member, open)).toBe(true)
    expect(canEdit(theirs, admin, open)).toBe(false)
    expect(canEdit(mine, member, archived)).toBe(false)
  })
})

describe("canDelete (D-05)", () => {
  it("lets the author delete, also in a DM", () => {
    expect(canDelete(mine, member, open)).toBe(true)
    expect(canDelete(mine, member, dm)).toBe(true)
  })

  it("lets the channel owner and team owner/admin delete others' messages", () => {
    expect(canDelete(theirs, member, { ...open, myRole: "owner" })).toBe(true)
    expect(canDelete(theirs, admin, open)).toBe(true)
    expect(canDelete(theirs, { userId: ME, teamRole: "owner" }, open)).toBe(true)
  })

  it("doesn't let a plain member delete others' messages", () => {
    expect(canDelete(theirs, member, open)).toBe(false)
  })

  it("keeps DMs to the author only", () => {
    expect(canDelete(theirs, admin, dm)).toBe(false)
  })

  it("is off in archived channels and channels I'm not in", () => {
    expect(canDelete(mine, admin, archived)).toBe(false)
    expect(canDelete(theirs, admin, null)).toBe(false)
  })
})
