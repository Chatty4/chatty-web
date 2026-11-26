import { describe, expect, it } from "vitest"

import { revealUnknownDuration } from "./media"

/** Just enough of an <audio> element: a duration, a position and durationchange listeners. */
function fakeMedia(duration: number) {
  const listeners = new Set<() => void>()
  const media = {
    duration,
    currentTime: 0,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }
  const durationKnown = (value: number) => {
    media.duration = value
    listeners.forEach((listener) => listener())
  }
  return { media, durationKnown, listeners }
}

describe("revealUnknownDuration", () => {
  it("leaves a file with a known length alone", () => {
    const { media, listeners } = fakeMedia(12)
    revealUnknownDuration(media as unknown as HTMLMediaElement)
    expect(media.currentTime).toBe(0)
    expect(listeners.size).toBe(0)
  })

  it("seeks to the end, then back to the start once the length is known", () => {
    const { media, durationKnown, listeners } = fakeMedia(Infinity)
    revealUnknownDuration(media as unknown as HTMLMediaElement)
    expect(media.currentTime).toBe(Number.MAX_SAFE_INTEGER)

    durationKnown(7.4)
    expect(media.currentTime).toBe(0)
    expect(listeners.size).toBe(0)
  })
})
