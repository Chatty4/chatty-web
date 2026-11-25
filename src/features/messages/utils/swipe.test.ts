import { describe, expect, it } from "vitest"

import {
  SWIPE_MAX_PX,
  SWIPE_TRIGGER_PX,
  swipeIntent,
  swipeOffset,
  swipeTriggers,
} from "./swipe"

describe("swipeIntent", () => {
  it("waits until the finger has moved a little", () => {
    expect(swipeIntent(4, 3)).toBe("undecided")
  })

  it("is a swipe when the finger goes mostly right", () => {
    expect(swipeIntent(20, 5)).toBe("swipe")
  })

  it("leaves up, down and slanted moves to the page, so it can scroll", () => {
    expect(swipeIntent(3, 20)).toBe("scroll")
    expect(swipeIntent(15, 12)).toBe("scroll")
  })

  it("leaves a swipe to the left to the page", () => {
    expect(swipeIntent(-20, 0)).toBe("scroll")
  })
})

describe("swipeOffset", () => {
  it("follows the finger up to the trigger", () => {
    expect(swipeOffset(30)).toBe(30)
    expect(swipeOffset(SWIPE_TRIGGER_PX)).toBe(SWIPE_TRIGGER_PX)
  })

  it("slows down past the trigger and stops at the maximum", () => {
    const past = swipeOffset(SWIPE_TRIGGER_PX + 20)
    expect(past).toBeGreaterThan(SWIPE_TRIGGER_PX)
    expect(past).toBeLessThan(SWIPE_TRIGGER_PX + 20)
    expect(swipeOffset(1000)).toBe(SWIPE_MAX_PX)
  })

  it("never moves left", () => {
    expect(swipeOffset(-40)).toBe(0)
  })
})

describe("swipeTriggers", () => {
  it("replies only once the message moved far enough", () => {
    expect(swipeTriggers(SWIPE_TRIGGER_PX - 1)).toBe(false)
    expect(swipeTriggers(SWIPE_TRIGGER_PX)).toBe(true)
  })
})
