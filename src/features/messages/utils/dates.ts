/** Local calendar day of an ISO timestamp, e.g. "2026-11-03". */
export function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** A short age like "5m ago", "3h ago" or "2d ago". */
export function formatTimeAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.max(1, Math.round((now.getTime() - Date.parse(iso)) / 60_000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

/** "Today", "Yesterday", or a date like "Monday, October 5" (year added when not this year). */
export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (dayKey(iso) === dayKey(now.toISOString())) return "Today"
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Yesterday"
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  }).format(date)
}
