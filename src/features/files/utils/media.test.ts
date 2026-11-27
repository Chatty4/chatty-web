import { describe, expect, it } from "vitest"

import { mediaKind, revealUnknownDuration } from "./media"

describe("mediaKind", () => {
  it("knows the videos every browser plays", () => {
    expect(mediaKind({ mime: "video/mp4", filename: "demo.mp4" })).toBe("video")
    expect(mediaKind({ mime: "video/webm;codecs=vp9", filename: "clip.webm" })).toBe("video")
  })

  it("knows sound by type or by name", () => {
    expect(mediaKind({ mime: "audio/webm", filename: "voice-message.webm" })).toBe("audio")
    expect(mediaKind({ mime: "application/octet-stream", filename: "song.mp3" })).toBe("audio")
  })

  it("leaves other files, and videos browsers can't play, to the other previews", () => {
    expect(mediaKind({ mime: "application/pdf", filename: "report.pdf" })).toBeNull()
    expect(mediaKind({ mime: "video/quicktime", filename: "clip.mov" })).toBeNull()
  })
})

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
