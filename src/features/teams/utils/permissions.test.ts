import { describe, expect, it } from "vitest"

import { canDeleteTeam, canManageMember, isTeamManager, offersRemove } from "./permissions"

describe("isTeamManager", () => {
  it("is true for owners and admins only", () => {
    expect(isTeamManager("owner")).toBe(true)
    expect(isTeamManager("admin")).toBe(true)
    expect(isTeamManager("member")).toBe(false)
  })
})

describe("canDeleteTeam", () => {
  it("is true for owners only", () => {
    expect(canDeleteTeam("owner")).toBe(true)
    expect(canDeleteTeam("admin")).toBe(false)
    expect(canDeleteTeam("member")).toBe(false)
  })
})

describe("canManageMember", () => {
  it("lets an owner manage anyone else, other owners included", () => {
    expect(canManageMember("owner", "owner", false)).toBe(true)
    expect(canManageMember("owner", "admin", false)).toBe(true)
    expect(canManageMember("owner", "member", false)).toBe(true)
  })

  it("lets an admin manage admins and members, not owners", () => {
    expect(canManageMember("admin", "member", false)).toBe(true)
    expect(canManageMember("admin", "admin", false)).toBe(true)
    expect(canManageMember("admin", "owner", false)).toBe(false)
  })

  it("never lets a plain member manage anyone", () => {
    expect(canManageMember("member", "member", false)).toBe(false)
  })

  it("never manages myself: leaving is separate (409 use_leave)", () => {
    expect(canManageMember("owner", "owner", true)).toBe(false)
    expect(canManageMember("admin", "admin", true)).toBe(false)
  })
})

describe("offersRemove", () => {
  it("offers to remove another owner to an owner", () => {
    expect(offersRemove("owner", "owner", false)).toBe(true)
  })

  it("doesn't offer to remove an owner to anyone else", () => {
    expect(offersRemove("admin", "owner", false)).toBe(false)
    expect(offersRemove("member", "owner", false)).toBe(false)
  })

  it("offers Remove on admin and member rows, disabled where not allowed", () => {
    expect(offersRemove("member", "admin", false)).toBe(true)
    expect(offersRemove("admin", "member", false)).toBe(true)
  })

  it("never on my own row", () => {
    expect(offersRemove("owner", "owner", true)).toBe(false)
    expect(offersRemove("member", "member", true)).toBe(false)
  })
})
