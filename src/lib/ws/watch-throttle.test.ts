import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { WatchMessage } from "./types"
import { createWatchThrottle, WATCH_INTERVAL_MS } from "./watch-throttle"

function setup() {
  const sent: string[] = []
  const throttle = createWatchThrottle((message: WatchMessage) => sent.push(message.channel_id))
  return { sent, throttle }
}

describe("createWatchThrottle", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("sends the first watch right away", () => {
    const { sent, throttle } = setup()
    throttle.watch("a")
    expect(sent).toEqual(["a"])
  })

  it("holds a watch sent too soon until the interval is over", () => {
    const { sent, throttle } = setup()
    throttle.watch("a")
    vi.advanceTimersByTime(300)

    throttle.watch("b")
    expect(sent).toEqual(["a"])
    vi.advanceTimersByTime(WATCH_INTERVAL_MS - 300 - 1)
    expect(sent).toEqual(["a"])
    vi.advanceTimersByTime(1)
    expect(sent).toEqual(["a", "b"])
  })

  it("sends only the newest of several waiting watches", () => {
    const { sent, throttle } = setup()
    throttle.watch("a")
    throttle.watch("b")
    throttle.watch("c")

    vi.advanceTimersByTime(WATCH_INTERVAL_MS)
    expect(sent).toEqual(["a", "c"])
  })

  it("sends right away once the interval has passed", () => {
    const { sent, throttle } = setup()
    throttle.watch("a")
    vi.advanceTimersByTime(WATCH_INTERVAL_MS)

    throttle.watch("b")
    expect(sent).toEqual(["a", "b"])
  })

  it("drops a waiting watch for a channel that was left", () => {
    const { sent, throttle } = setup()
    throttle.watch("a")
    throttle.watch("b")

    throttle.unwatch("b")
    vi.advanceTimersByTime(WATCH_INTERVAL_MS)
    expect(sent).toEqual(["a"])
  })

  it("keeps a waiting watch when another channel is left", () => {
    const { sent, throttle } = setup()
    throttle.watch("a")
    throttle.watch("b")

    throttle.unwatch("a")
    vi.advanceTimersByTime(WATCH_INTERVAL_MS)
    expect(sent).toEqual(["a", "b"])
  })

  it("starts over for a new socket, without the waiting watch", () => {
    const { sent, throttle } = setup()
    throttle.watch("a")
    throttle.watch("b")

    throttle.reset()
    vi.advanceTimersByTime(WATCH_INTERVAL_MS)
    expect(sent).toEqual(["a"])

    throttle.watch("c")
    expect(sent).toEqual(["a", "c"])
  })
})
