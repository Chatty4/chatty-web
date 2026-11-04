import { describe, expect, it } from "vitest"

import { formatTimeAgo } from "./dates"

const now = new Date("2026-11-04T12:00:00Z")

describe("formatTimeAgo", () => {
  it.each([
    ["2026-11-04T11:59:50Z", "1m ago"],
    ["2026-11-04T11:55:00Z", "5m ago"],
    ["2026-11-04T09:00:00Z", "3h ago"],
    ["2026-11-02T12:00:00Z", "2d ago"],
  ])("%s is %s", (iso, expected) => {
    expect(formatTimeAgo(iso, now)).toBe(expected)
  })

  it("never shows a negative age when clocks disagree", () => {
    expect(formatTimeAgo("2026-11-04T12:05:00Z", now)).toBe("1m ago")
  })
})
