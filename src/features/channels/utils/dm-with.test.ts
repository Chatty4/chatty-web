import { describe, expect, it } from "vitest"

import { MAX_DM_OTHERS, parseStartDmWith, startDmWithUrl } from "./dm-with"

describe("startDmWithUrl", () => {
  it("selects the DM's other people", () => {
    expect(startDmWithUrl("t1", ["me", "u2", "u3"], "me")).toBe("/teams/t1/dms/new?with=u2,u3")
  })

  it("opens the plain page when nobody else is in the DM", () => {
    expect(startDmWithUrl("t1", ["me"], "me")).toBe("/teams/t1/dms/new")
  })
})

describe("parseStartDmWith", () => {
  it("reads the ids, without me and without duplicates", () => {
    expect(parseStartDmWith("u2,me,u3,u2", "me")).toEqual(["u2", "u3"])
  })

  it("is empty without the param", () => {
    expect(parseStartDmWith(null, "me")).toEqual([])
    expect(parseStartDmWith("", "me")).toEqual([])
    expect(parseStartDmWith(" , ", "me")).toEqual([])
  })

  it("keeps at most the DM limit", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `u${i}`)
    expect(parseStartDmWith(ids.join(","), "me")).toHaveLength(MAX_DM_OTHERS)
  })

  it("round-trips with startDmWithUrl", () => {
    const url = new URL(startDmWithUrl("t1", ["me", "u2", "u3"], "me"), "http://x")
    expect(parseStartDmWith(url.searchParams.get("with"), "me")).toEqual(["u2", "u3"])
  })
})
