// Keeps the quote of a reply in step with the message it quotes (chatty-infra/docs/events.md
// message.edited and message.deleted). Pure functions; apply-event and pins call them.

import { REPLY_PREVIEW_CHARS } from "../constants"
import type { ApiMessage } from "../types"

/** The quote of `quotedId` shows its edited text. Other messages come back unchanged. */
export function editQuote<M extends ApiMessage>(message: M, quotedId: string, body: string): M {
  const quote = message.reply_to
  if (quote?.id !== quotedId || quote.deleted) return message
  return { ...message, reply_to: { ...quote, body: body.slice(0, REPLY_PREVIEW_CHARS) } }
}

/** `quotedId` was deleted: its quote keeps only who wrote it and where it was. */
export function deleteQuote<M extends ApiMessage>(message: M, quotedId: string): M {
  const quote = message.reply_to
  if (quote?.id !== quotedId || quote.deleted) return message
  return { ...message, reply_to: { ...quote, body: "", deleted: true } }
}
