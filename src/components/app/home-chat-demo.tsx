import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"

import { Avatar } from "@/components/ui/avatar"
import { TypingDots } from "@/features/typing/ui/typing-dots"

import { messageAt, next, START, WINDOW, type DemoState } from "./home-chat-demo-script"

/** Runs only while the panel is on screen (not display:none on mobile) and the tab is visible. */
function useActive(ref: RefObject<HTMLElement | null>): boolean {
  const [onScreen, setOnScreen] = useState(false)
  const [tabVisible, setTabVisible] = useState(!document.hidden)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting))
    observer.observe(el)
    const onVisibility = () => setTabVisible(!document.hidden)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [ref])

  return onScreen && tabVisible
}

/**
 * An endless sample conversation for the Home sidebar, like a chat: each new message (typing
 * dots first, for some) comes in at the bottom and nudges the rest up; the oldest fall off the
 * top. Only the last WINDOW messages are mounted. Decorative, so screen readers skip it. Only
 * opacity and transform animate; one state update per step. With reduced motion it stays still.
 */
export function HomeChatDemo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const items = useRef(new Map<number, HTMLDivElement>())
  // The newest message and where it sat, to animate the list up by however much it moved.
  const anchor = useRef<{ index: number; top: number } | null>(null)
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const active = useActive(containerRef) && !reducedMotion
  const [state, setState] = useState<DemoState>(START)

  useEffect(() => {
    if (!active) return
    const [nextState, delay] = next(state)
    const id = setTimeout(() => setState(nextState), delay)
    return () => clearTimeout(id)
  }, [state, active])

  const end = state.shown + (state.typing ? 1 : 0)
  const indexes = Array.from({ length: WINDOW }, (_, k) => end - WINDOW + k)

  // FLIP: the list is pinned to the bottom, so a new or taller message pushes the rest up at once.
  // Start the list back where it was and slide it into place. offsetTop ignores transforms.
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    // Relative to the container, whichever of the two the browser reports offsetTop against.
    const topOf = (el: HTMLElement) => el.offsetTop + (el.offsetParent === list ? list.offsetTop : 0)
    const previous = anchor.current && items.current.get(anchor.current.index)
    if (previous && anchor.current) {
      const moved = anchor.current.top - topOf(previous)
      if (moved > 0) {
        list.style.transition = "none"
        list.style.transform = `translateY(${moved}px)`
        void list.offsetHeight // apply the start position before turning the transition back on
        list.style.transition = ""
        list.style.transform = ""
      }
    }
    const newest = items.current.get(end - 1)
    anchor.current = newest ? { index: end - 1, top: topOf(newest) } : null
  }, [end, state.typing])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="relative hidden min-h-0 flex-1 flex-col justify-end overflow-hidden px-5 pb-5 select-none md:flex"
    >
      <div
        ref={listRef}
        className="flex shrink-0 flex-col gap-4 transition-transform duration-500 ease-out"
      >
        {indexes.map((i) => {
          const message = messageAt(i)
          const typing = state.typing && i === end - 1
          return (
            <div
              key={i}
              ref={(el) => {
                if (el) items.current.set(i, el)
                else items.current.delete(i)
              }}
              className="flex gap-2.5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
            >
              <Avatar name={message.name} className="size-7 text-[10px]" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground">{message.name}</p>
                {typing ? (
                  <div className="flex h-[19px] items-center">
                    <TypingDots />
                  </div>
                ) : (
                  <p className="text-[13px] text-muted-foreground">{message.text}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
