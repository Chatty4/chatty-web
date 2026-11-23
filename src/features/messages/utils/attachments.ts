// How a message's files are shown (api-chat.md, GET /messages/{id}/attachments).

import { IMAGE_MIMES } from "@/features/files"

/** Images we show inline; every other file is a card with a download link. */
export function isInlineImage(mime: string): boolean {
  return IMAGE_MIMES.includes(mime)
}

// The types every current browser plays; others (e.g. .mov, .avi) stay files to download.
const VIDEO_MIMES = ["video/mp4", "video/webm", "video/ogg"]

/** Videos we show inline as a player. */
export function isInlineVideo(mime: string): boolean {
  return VIDEO_MIMES.includes(mime)
}

/**
 * How many images go in each row of a message's image grid, top to bottom: rows of 3, with the
 * leftover 1 or 2 on top as bigger tiles. 3 images are 1 + 2, 4 are 2 + 2.
 */
export function imageRows(count: number): number[] {
  if (count <= 2) return count > 0 ? [count] : []
  if (count === 3) return [1, 2]
  if (count === 4) return [2, 2]
  const rest = count % 3
  return [...(rest ? [rest] : []), ...Array<number>(Math.floor(count / 3)).fill(3)]
}

/** A URL less than a minute from expiring is fetched again before a new load or a click. */
export function needsFreshUrl(expiresAt: string, now = Date.now()): boolean {
  return new Date(expiresAt).getTime() - now < 60_000
}
