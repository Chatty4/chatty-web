// Keeps the viewport on the same message when older history is added above it.

export type RowBox = { id: string; top: number; bottom: number }

/** A row and where it sat, measured from the same origin as the viewport top. */
export type ScrollAnchor = { id: string; top: number }

/** The first row still visible at the top of the viewport. Rows are in document order. */
export function pickAnchor(rows: RowBox[], viewportTop: number): ScrollAnchor | null {
  const row = rows.find((r) => r.bottom > viewportTop)
  return row ? { id: row.id, top: row.top } : null
}

/** How far to scroll so the anchored row returns to where it was. */
export function anchorCorrection(anchor: ScrollAnchor, currentTop: number): number {
  return currentTop - anchor.top
}
