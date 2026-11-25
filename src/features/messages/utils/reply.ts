// Replies: the quote a reply shows of the message it replies to (chatty-infra/docs/api-chat.md,
// the message object, reply_to).

import { isGifMessage } from "@/features/gifs"

import { REPLY_PREVIEW_CHARS } from "../constants"
import type { ApiMessage, ReplyPreview } from "../types"
import { decodeMentions } from "./mentions"

/** The quote of a loaded message, as the server builds it: for a reply's optimistic copy. */
export function toReplyPreview(message: ApiMessage): ReplyPreview {
  return {
    id: message.id,
    seq: message.seq,
    author_id: message.author_id,
    body: message.body.slice(0, REPLY_PREVIEW_CHARS),
    deleted: message.deleted_at !== null,
  }
}

/**
 * What a quote says: the text with mentions as @Name, or what stands for it. Every message has
 * text or files, so an empty body that isn't deleted is a message with only files.
 */
export function quoteText(quote: ReplyPreview, names: Record<string, string>): string {
  if (quote.deleted) return "Original message was deleted"
  const body = quote.body.trim()
  if (!body) return "📎 File"
  if (isGifMessage(body)) return "GIF"
  return decodeMentions(body, names)
}
