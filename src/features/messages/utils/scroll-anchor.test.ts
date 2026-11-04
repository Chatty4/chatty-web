import { describe, expect, it } from "vitest"

import { anchorCorrection, pickAnchor } from "./scroll-anchor"

const rows = [
  { id: "a", top: -80, bottom: -40 },
  { id: "b", top: -40, bottom: 20 },
  { id: "c", top: 20, bottom: 60 },
]

describe("pickAnchor", () => {
  it("picks the first row that reaches into the viewport", () => {
    expect(pickAnchor(rows, 0)).toEqual({ id: "b", top: -40 })
  })

  it("skips a row that ends exactly at the viewport top", () => {
    expect(pickAnchor(rows, -40)).toEqual({ id: "b", top: -40 })
  })

  it("returns null with nothing to anchor to", () => {
    expect(pickAnchor([], 0)).toBeNull()
    expect(pickAnchor(rows, 100)).toBeNull()
  })
})

describe("anchorCorrection", () => {
  it("scrolls down by however far the row was pushed", () => {
    expect(anchorCorrection({ id: "b", top: -40 }, 960)).toBe(1000)
  })

  it("is zero when the browser already kept the row in place", () => {
    expect(anchorCorrection({ id: "b", top: -40 }, -40)).toBe(0)
  })
})
