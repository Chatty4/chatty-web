// How a message's files are shown (api-chat.md, GET /messages/{id}/attachments).

import { IMAGE_MIMES } from "@/features/files"

/** Images we show inline; every other file is a card with a download link. */
export function isInlineImage(mime: string): boolean {
  return IMAGE_MIMES.includes(mime)
}

/** A URL less than a minute from expiring is fetched again before a new load or a click. */
export function needsFreshUrl(expiresAt: string, now = Date.now()): boolean {
  return new Date(expiresAt).getTime() - now < 60_000
}
