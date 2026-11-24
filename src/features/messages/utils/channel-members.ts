// When the @mention list of the open channel is out of date. No WebSocket message says someone
// joined or was added (chatty-infra/docs/events.md), so a message from someone the list doesn't
// know is the signal that the channel has a new member.

import type { InboundWsMessage } from "@/lib/ws/types"

import type { ApiMessage } from "../types"

type MessageCreatedPayload = { message: Pick<ApiMessage, "author_id"> }

/**
 * The author of a new message in this channel who isn't in `memberIds` yet, or null.
 * `memberIds` is null while the list is loading: the load in progress includes them anyway.
 */
export function unknownAuthor(
  message: InboundWsMessage,
  channelId: string,
  memberIds: ReadonlySet<string> | null,
): string | null {
  if (memberIds === null) return null
  if (message.type !== "event" || message.event.type !== "message.created") return null
  if (message.event.channel_id !== channelId) return null
  const { author_id } = (message.event.payload as MessageCreatedPayload).message
  return memberIds.has(author_id) ? null : author_id
}
