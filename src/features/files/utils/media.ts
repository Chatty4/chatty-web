// Sound and video files: a message plays them inline, and the preview window plays them too.

import { VIDEO_MIMES } from "./limits"
import { isAudioFile } from "./preview"

export type MediaKind = "audio" | "video"

/** "video" for the types every browser plays (VIDEO_MIMES), "audio" for sound, else null. */
export function mediaKind(file: { mime: string; filename: string }): MediaKind | null {
  const mime = file.mime.split(";")[0]!.trim().toLowerCase()
  if (VIDEO_MIMES.includes(mime)) return "video"
  return isAudioFile(file) ? "audio" : null
}

/**
 * Browsers' own recorders (MediaRecorder) write WebM without a length, so the player shows no
 * total time and can't seek until the end has played. Seeking far past the end makes the browser
 * work the length out; once it knows, playback goes back to the start. Call on loadedmetadata.
 */
export function revealUnknownDuration(media: HTMLMediaElement): void {
  if (Number.isFinite(media.duration)) return
  const rewind = () => {
    if (!Number.isFinite(media.duration)) return
    media.removeEventListener("durationchange", rewind)
    media.currentTime = 0
  }
  media.addEventListener("durationchange", rewind)
  media.currentTime = Number.MAX_SAFE_INTEGER
}
