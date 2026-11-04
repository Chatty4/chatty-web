import { useCallback, useLayoutEffect, useRef, type RefObject } from "react"

import { anchorCorrection, pickAnchor, type ScrollAnchor } from "../utils/scroll-anchor"

/**
 * Holds the viewport on a message across a prepend. Call `capture` before the content
 * changes; when `contentKey` changes the list is corrected before the browser paints.
 * The correction measures the real position, so it adds nothing if the browser's own
 * scroll anchoring already kept the row in place.
 */
export function useScrollAnchor(listRef: RefObject<HTMLElement | null>, contentKey: string) {
  const anchorRef = useRef<ScrollAnchor | null>(null)

  const capture = useCallback(() => {
    const list = listRef.current
    if (!list) return
    const rows = Array.from(list.querySelectorAll<HTMLElement>("[data-message-id]"), (row) => {
      const { top, bottom } = row.getBoundingClientRect()
      return { id: row.dataset.messageId ?? "", top, bottom }
    })
    anchorRef.current = pickAnchor(rows, list.getBoundingClientRect().top)
  }, [listRef])

  const clear = useCallback(() => {
    anchorRef.current = null
  }, [])

  useLayoutEffect(() => {
    const list = listRef.current
    const anchor = anchorRef.current
    if (!list || !anchor) return
    anchorRef.current = null
    const row = list.querySelector(`[data-message-id="${CSS.escape(anchor.id)}"]`)
    if (row) list.scrollTop += anchorCorrection(anchor, row.getBoundingClientRect().top)
  }, [listRef, contentKey])

  return { capture, clear }
}
