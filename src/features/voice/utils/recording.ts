// Voice messages: recorded with the browser's MediaRecorder and sent as an audio attachment
// through the usual upload (api-core.md, Files). No library: every current browser records.

/** Formats tried in order: Opus in WebM (Chrome, Edge, Firefox), Opus in Ogg, AAC in MP4 (Safari). */
export const RECORDING_MIMES = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/mp4",
] as const

/**
 * Plenty for speech; browsers default to 128 kbps, which is music quality. About 4 KB per second,
 * so the longest recording is about 1.2 MB.
 */
export const RECORDING_BITS_PER_SECOND = 32_000

/** A recording stops by itself here; it is kept and attached. */
export const MAX_RECORDING_MS = 5 * 60_000

/** Anything shorter is a slip of the finger: it is dropped, not attached. */
export const MIN_RECORDING_MS = 500

const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
}

/** The first format this browser records, or null when it records none of them. */
export function pickRecordingMime(isSupported: (mime: string) => boolean): string | null {
  return RECORDING_MIMES.find((mime) => isSupported(mime)) ?? null
}

/**
 * "audio/webm;codecs=opus" → "audio/webm". chatty-core's confirm compares the uploaded object's
 * Content-Type with the declared type, and MinIO keeps only what the upload sent, so the
 * parameters are left out of both.
 */
export function baseMime(mime: string): string {
  return mime.split(";")[0]!.trim().toLowerCase()
}

/** "voice-message-2026-11-26-153012.webm", in local time. */
export function recordingFileName(mime: string, at: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const date = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
  const time = `${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`
  return `voice-message-${date}-${time}.${EXTENSIONS[baseMime(mime)] ?? "webm"}`
}

/** The recorded chunks as one file to upload, typed without codec parameters. */
export function toRecordingFile(chunks: Blob[], mime: string, at: Date): File {
  return new File(chunks, recordingFileName(mime, at), { type: baseMime(mime) })
}

/** "0:07", "1:05", "12:00". */
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

/** What to tell the user when the microphone can't be used. */
export function describeMicError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ""
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Allow the microphone for this site to record a voice message."
    case "NotFoundError":
    case "OverconstrainedError":
      return "No microphone was found."
    case "NotReadableError":
      return "The microphone is being used by another app."
    default:
      return "Couldn't start recording. Try again."
  }
}
