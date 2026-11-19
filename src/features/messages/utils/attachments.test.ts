import { describe, expect, it } from "vitest"

import { imageRows, isInlineImage, needsFreshUrl } from "./attachments"

describe("imageRows", () => {
  it.each([
    [0, []],
    [1, [1]],
    [2, [2]],
    [3, [1, 2]],
    [4, [2, 2]],
    [5, [2, 3]],
    [6, [3, 3]],
    [7, [1, 3, 3]],
    [9, [3, 3, 3]],
    [10, [1, 3, 3, 3]],
  ])("puts %i images in rows of %j", (count, rows) => {
    expect(imageRows(count)).toEqual(rows)
    expect(imageRows(count).reduce((a, b) => a + b, 0)).toBe(count)
  })
})

describe("isInlineImage", () => {
  it("shows the four image types inline, and SVG as a file", () => {
    expect(isInlineImage("image/png")).toBe(true)
    expect(isInlineImage("image/svg+xml")).toBe(false)
    expect(isInlineImage("application/pdf")).toBe(false)
  })
})

describe("needsFreshUrl", () => {
  const now = Date.parse("2026-11-18T12:00:00Z")

  it("keeps a URL with more than a minute left", () => {
    expect(needsFreshUrl("2026-11-18T12:01:01Z", now)).toBe(false)
  })

  it("asks again under a minute before it expires, or after", () => {
    expect(needsFreshUrl("2026-11-18T12:00:59Z", now)).toBe(true)
    expect(needsFreshUrl("2026-11-18T11:59:00Z", now)).toBe(true)
  })
})
