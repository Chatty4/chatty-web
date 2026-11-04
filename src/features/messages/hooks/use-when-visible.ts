import { useEffect, useRef, type RefObject } from "react"

type UseWhenVisibleOptions = {
  /** The scroll container. */
  rootRef: RefObject<HTMLElement | null>
  enabled: boolean
  /** Starts observing afresh when this changes, for example on a channel switch. */
  resetKey: string
  /** Grows the root so the callback fires before the target is on screen. */
  rootMargin: string
  onVisible: () => void
}

/**
 * Calls `onVisible` when the returned ref's element enters the scroll container.
 * Going from disabled to enabled observes afresh, which reports the current position:
 * a page too short to push the element out of view loads the next one by itself.
 */
export function useWhenVisible<T extends HTMLElement>({
  rootRef,
  enabled,
  resetKey,
  rootMargin,
  onVisible,
}: UseWhenVisibleOptions) {
  const targetRef = useRef<T>(null)
  const onVisibleRef = useRef(onVisible)

  useEffect(() => {
    onVisibleRef.current = onVisible
  })

  useEffect(() => {
    const target = targetRef.current
    if (!enabled || !target) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onVisibleRef.current()
      },
      { root: rootRef.current, rootMargin },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [enabled, resetKey, rootRef, rootMargin])

  return targetRef
}
