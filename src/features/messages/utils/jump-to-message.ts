const HIGHLIGHT_MS = 1500

/**
 * Scrolls to a message in the list and briefly highlights it. Returns false when it isn't
 * loaded: the API only pages backwards, so an older message can't be fetched directly.
 */
export function jumpToMessage(messageId: string): boolean {
  const row = document.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(messageId)}"]`)
  if (!row) return false

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  row.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" })
  row.dataset.flash = ""
  window.setTimeout(() => delete row.dataset.flash, HIGHLIGHT_MS)
  return true
}
