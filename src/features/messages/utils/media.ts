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
