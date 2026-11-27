import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"

import { Avatar } from "@/components/ui/avatar"
import { TypingDots } from "@/features/typing/ui/typing-dots"
import { cn } from "@/lib/utils"

import { MESSAGES, next, START, type DemoState } from "./home-chat-demo-script"

const BOTTOM_GAP_PX = 20

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
 * A looping sample conversation for the Home sidebar. Messages arrive one by one, the list
 * scrolls like a chat once it fills the panel, then everything moves up and it starts over.
 * Decorative, so screen readers skip it. Only opacity and transform animate; one state update
 * per message. With reduced motion it shows the conversation still.
 */
export function HomeChatDemo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const active = useActive(containerRef) && !reducedMotion
  const [state, setState] = useState<DemoState>(START)

  useEffect(() => {
    if (!active) return
    const [nextState, delay] = next(state)
    const id = setTimeout(() => setState(nextState), delay)
    return () => clearTimeout(id)
  }, [state, active])

  // Keep the newest message in view, like a chat; on "leave" move the whole list above the top.
  useLayoutEffect(() => {
    const container = containerRef.current
    const list = listRef.current
    if (!container || !list) return
    let offset = 0
    if (state.phase === "leave") {
      offset = list.offsetTop + list.offsetHeight
    } else if (state.phase === "play") {
      const last = itemRefs.current[state.typing ? state.shown : state.shown - 1]
      if (last) offset = Math.max(0, last.offsetTop + last.offsetHeight + BOTTOM_GAP_PX - container.clientHeight)
    }
    list.style.transform = `translateY(-${offset}px)`
  }, [state])

  const isVisible = (i: number) =>
    reducedMotion || i < state.shown || (i === state.shown && state.typing)

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="relative hidden min-h-0 flex-1 overflow-hidden px-5 pt-5 select-none md:block"
    >
      <div
        ref={listRef}
        className={cn(
          "flex flex-col gap-4",
          state.phase === "reset"
            ? "transition-none [&_*]:transition-none"
            : "transition-transform duration-700 ease-out",
        )}
      >
        {MESSAGES.map((message, i) => (
          <div
            key={i}
            ref={(el) => {
              itemRefs.current[i] = el
            }}
            className={cn(
              "flex gap-2.5 transition-[opacity,translate] duration-300 ease-out",
              isVisible(i) ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0",
            )}
          >
            <Avatar name={message.name} className="size-7 text-[10px]" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground">{message.name}</p>
              {i === state.shown && state.typing && !reducedMotion ? (
                <div className="flex h-[19px] items-center">
                  <TypingDots />
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground">{message.text}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
