import { describe, expect, it } from "vitest"

import {
  baseMime,
  describeMicError,
  formatDuration,
  pickRecordingMime,
  recordingFileName,
  toRecordingFile,
} from "./recording"

const at = new Date(2026, 10, 26, 15, 3, 9) // local time

describe("pickRecordingMime", () => {
  it("takes Opus in WebM first", () => {
    expect(pickRecordingMime(() => true)).toBe("audio/webm;codecs=opus")
  })

  it("falls back to AAC in MP4, as on Safari", () => {
    expect(pickRecordingMime((mime) => mime === "audio/mp4")).toBe("audio/mp4")
  })

  it("is null when the browser records none of them", () => {
    expect(pickRecordingMime(() => false)).toBeNull()
  })
})

describe("baseMime", () => {
  it("drops the codec parameters", () => {
    expect(baseMime("audio/webm;codecs=opus")).toBe("audio/webm")
    expect(baseMime("Audio/MP4")).toBe("audio/mp4")
  })
})

describe("recordingFileName", () => {
  it("names the file after the local time, with the format's extension", () => {
    expect(recordingFileName("audio/webm;codecs=opus", at)).toBe(
      "voice-message-2026-11-26-150309.webm",
    )
    expect(recordingFileName("audio/mp4", at)).toBe("voice-message-2026-11-26-150309.m4a")
    expect(recordingFileName("audio/ogg;codecs=opus", at)).toBe("voice-message-2026-11-26-150309.ogg")
  })
})

describe("toRecordingFile", () => {
  it("joins the chunks into one file typed without parameters", async () => {
    const file = toRecordingFile([new Blob(["ab"]), new Blob(["cd"])], "audio/webm;codecs=opus", at)
    expect(file.type).toBe("audio/webm")
    expect(file.name).toBe("voice-message-2026-11-26-150309.webm")
    expect(await file.text()).toBe("abcd")
  })
})

describe("formatDuration", () => {
  it("shows minutes and two-digit seconds", () => {
    expect(formatDuration(0)).toBe("0:00")
    expect(formatDuration(7_900)).toBe("0:07")
    expect(formatDuration(65_000)).toBe("1:05")
    expect(formatDuration(720_000)).toBe("12:00")
  })
})

describe("describeMicError", () => {
  it("explains a refused or missing microphone", () => {
    expect(describeMicError(new DOMException("", "NotAllowedError"))).toMatch(/Allow the microphone/)
    expect(describeMicError(new DOMException("", "NotFoundError"))).toBe("No microphone was found.")
    expect(describeMicError(new DOMException("", "NotReadableError"))).toMatch(/another app/)
    expect(describeMicError(new Error("boom"))).toBe("Couldn't start recording. Try again.")
  })
})
