// Swipe right on a message to reply to it. Pure decisions about the gesture; the
// SwipeToReply component feeds them pointer movements.

/** How far the finger moves before the gesture counts as a swipe or as a scroll. */
export const SWIPE_DECIDE_PX = 10
/** How far the message must move to reply when the finger lifts. */
export const SWIPE_TRIGGER_PX = 56
/** The message stops here, however far the finger goes. */
export const SWIPE_MAX_PX = 80

export type SwipeIntent = "undecided" | "swipe" | "scroll"

/**
 * What a movement from the start point means. Mostly right is a swipe; anything else (up,
 * down, left) belongs to the page, so it can scroll as usual.
 */
export function swipeIntent(dx: number, dy: number): SwipeIntent {
  if (Math.hypot(dx, dy) < SWIPE_DECIDE_PX) return "undecided"
  return dx > 0 && dx > Math.abs(dy) * 1.5 ? "swipe" : "scroll"
}

/** How far the message moves for a finger `dx` to the right: it slows down past the trigger. */
export function swipeOffset(dx: number): number {
  if (dx <= 0) return 0
  if (dx <= SWIPE_TRIGGER_PX) return dx
  const past = (dx - SWIPE_TRIGGER_PX) * 0.35
  return Math.min(SWIPE_TRIGGER_PX + past, SWIPE_MAX_PX)
}

/** Lifting the finger here replies. */
export function swipeTriggers(offset: number): boolean {
  return offset >= SWIPE_TRIGGER_PX
}
