import { useEffect, type RefObject } from "react"

/**
 * Keeps a list at its bottom when its box changes height while it was there, such as when a
 * phone's keyboard opens and the page gets shorter. Otherwise the newest messages slide out of view.
 */
export function useStayAtBottom(listRef: RefObject<HTMLElement | null>, atBottomRef: RefObject<boolean>) {
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    let height = list.clientHeight
    // The first call is only the observer starting: it would undo a jump to an older message.
    const observer = new ResizeObserver(() => {
      const next = list.clientHeight
      if (next !== height && atBottomRef.current) list.scrollTop = list.scrollHeight
      height = next
    })
    observer.observe(list)
    return () => observer.disconnect()
  }, [listRef, atBottomRef])
}
