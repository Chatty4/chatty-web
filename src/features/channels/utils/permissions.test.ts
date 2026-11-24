import { describe, expect, it } from "vitest"

import type { MyChannelSettings } from "../types"
import { canManageChannel } from "./permissions"

const my = (role: MyChannelSettings["role"]): MyChannelSettings => ({
  role,
  notify_level: "mentions",
  muted: false,
  hidden: false,
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

  it("refuses everyone in a DM", () => {
    expect(canManageChannel({ kind: "dm", my: my("owner") }, "owner")).toBe(false)
    expect(canManageChannel({ kind: "dm", my: my("member") }, "admin")).toBe(false)
  })
})
