import { describe, expect, it } from "vitest"

import { dateRangeError, toDateRange, type DateFilter } from "./date-range"

const NOW = new Date(2026, 10, 17, 15, 30) // 17 Nov 2026, 15:30 local
const filter = (overrides: Partial<DateFilter>): DateFilter => ({
  preset: "any",
  from: "",
  to: "",
  ...overrides,
})

describe("toDateRange", () => {
  it("sends nothing for any time", () => {
    expect(toDateRange(filter({}), NOW)).toEqual({})
  })

  it("today starts at local midnight", () => {
    expect(toDateRange(filter({ preset: "today" }), NOW)).toEqual({
      after: new Date(2026, 10, 17).toISOString(),
    })
  })

  it("the last 7 days count back from now", () => {
    expect(toDateRange(filter({ preset: "7d" }), NOW).after).toBe(
      new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    )
  })

  it("a custom range includes the whole end day", () => {
    expect(toDateRange(filter({ preset: "custom", from: "2026-11-01", to: "2026-11-05" }), NOW)).toEqual({
      after: new Date(2026, 10, 1).toISOString(),
      before: new Date(2026, 10, 6).toISOString(),
    })
  })

  it("a custom range can be open on one side", () => {
    expect(toDateRange(filter({ preset: "custom", to: "2026-11-30" }), NOW)).toEqual({
      after: undefined,
      before: new Date(2026, 11, 1).toISOString(),
    })
  })
})

describe("dateRangeError", () => {
  it("rejects a start after the end", () => {
    expect(dateRangeError(filter({ preset: "custom", from: "2026-11-05", to: "2026-11-01" }))).toBe(
      "The start date is after the end date.",
    )
  })

  it("accepts a one-day range and open ranges", () => {
    expect(dateRangeError(filter({ preset: "custom", from: "2026-11-05", to: "2026-11-05" }))).toBeNull()
    expect(dateRangeError(filter({ preset: "custom", from: "2026-11-05" }))).toBeNull()
  })
})
