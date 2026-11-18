import { describe, expect, it } from "vitest"

import { isInlineImage, needsFreshUrl } from "./attachments"

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
