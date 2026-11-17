// The Date filter of the search panel, as the `after` / `before` times GET /search takes.

export type DatePreset = "any" | "today" | "7d" | "30d" | "custom"

export type DateFilter = {
  preset: DatePreset
  /** Custom range, as <input type="date"> gives it (YYYY-MM-DD, the user's local day). */
  from: string
  to: string
}

export type DateRange = { after?: string; before?: string }

const DAY_MS = 24 * 60 * 60 * 1000

/** Local midnight of a YYYY-MM-DD day, plus `addDays`. */
function localDay(day: string, addDays = 0): Date {
  const [year, month, date] = day.split("-").map(Number)
  return new Date(year!, month! - 1, date! + addDays)
}

/** The range to send; both ends are UTC ISO times. `to` includes that whole day. */
export function toDateRange(filter: DateFilter, now: Date = new Date()): DateRange {
  switch (filter.preset) {
    case "any":
      return {}
    case "today":
      return { after: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString() }
    case "7d":
      return { after: new Date(now.getTime() - 7 * DAY_MS).toISOString() }
    case "30d":
      return { after: new Date(now.getTime() - 30 * DAY_MS).toISOString() }
    case "custom":
      return {
        after: filter.from ? localDay(filter.from).toISOString() : undefined,
        before: filter.to ? localDay(filter.to, 1).toISOString() : undefined,
      }
  }
}

/** Why a custom range can't be searched, or null. */
export function dateRangeError(filter: DateFilter): string | null {
  if (filter.preset !== "custom" || !filter.from || !filter.to) return null
  return filter.from > filter.to ? "The start date is after the end date." : null
}
