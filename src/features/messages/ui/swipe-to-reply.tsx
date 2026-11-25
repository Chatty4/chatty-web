import { useRef, useState, type PointerEvent, type ReactNode } from "react"
import { Reply } from "lucide-react"

import { cn } from "@/lib/utils"

import { SWIPE_TRIGGER_PX, swipeIntent, swipeOffset, swipeTriggers } from "../utils/swipe"

/** A swipe can't start on these: they have their own touch behaviour. */
const OWN_GESTURES = "a, button, input, textarea, select, [contenteditable='true']"

type Gesture = { pointerId: number; startX: number; startY: number; swiping: boolean; offset: number }

type SwipeToReplyProps = {
  /** False where the message can't be replied to: nothing moves. */
  enabled: boolean
  onReply: () => void
  children: ReactNode
}

/**
 * Swipe a message to the right with a finger to reply to it, as on a phone. The page still
 * scrolls up and down (touch-action: pan-y); the mouse uses the Reply button instead.
 */
export function SwipeToReply({ enabled, onReply, children }: SwipeToReplyProps) {
  const gesture = useRef<Gesture | null>(null)
  const [drag, setDrag] = useState({ offset: 0, active: false })

  const finish = (reply: boolean) => {
    gesture.current = null
    setDrag({ offset: 0, active: false })
    if (reply) onReply()
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || event.pointerType === "mouse" || !event.isPrimary) return
    if ((event.target as Element).closest(OWN_GESTURES)) return
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      swiping: false,
      offset: 0,
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current
    if (!current || event.pointerId !== current.pointerId) return
    const dx = event.clientX - current.startX
    if (!current.swiping) {
      const intent = swipeIntent(dx, event.clientY - current.startY)
      if (intent === "undecided") return
      if (intent === "scroll") {
        gesture.current = null
        return
      }
      current.swiping = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const offset = swipeOffset(dx)
    // A short buzz where lifting the finger starts replying (phones that support it).
    if (swipeTriggers(offset) && !swipeTriggers(current.offset)) navigator.vibrate?.(10)
    current.offset = offset
    setDrag({ offset, active: true })
  }

  const onPointerUp = () => {
    const current = gesture.current
    if (current) finish(current.swiping && swipeTriggers(current.offset))
  }

  const { offset, active } = drag
  const progress = Math.min(offset / SWIPE_TRIGGER_PX, 1)

  return (
    <div
      // overflow-x-clip: the moved message must not widen the page (clip, unlike hidden,
      // still lets the toolbar stick out above and below).
      className={cn("relative overflow-x-clip", enabled && "touch-pan-y", active && "select-none")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => finish(false)}
    >
      {offset > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 left-3 grid size-8 place-items-center rounded-full bg-surface-hover",
            swipeTriggers(offset) ? "text-primary" : "text-muted-foreground",
          )}
          style={{ opacity: progress, transform: `translateY(-50%) scale(${0.6 + 0.4 * progress})` }}
        >
          <Reply className="size-4" />
        </span>
      )}
      {/* No transform at rest: one would also move fixed overlays inside the message. */}
      <div
        className={cn(!active && "transition-transform duration-200 motion-reduce:transition-none")}
        style={offset > 0 ? { transform: `translateX(${offset}px)` } : undefined}
      >
        {children}
      </div>
    </div>
  )
}
