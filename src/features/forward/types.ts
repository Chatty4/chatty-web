// Types for forwarding a message (D-20). Contract: chatty-infra/docs/api-chat.md,
// POST /channels/{id}/messages with forward_of.

import type { ChannelKind } from "@/features/channels"
import type { SendFailure } from "@/features/messages/types"

/** A channel or DM of the current team I can write in. */
export type Destination = {
  id: string
  kind: ChannelKind
  /** The channel's name, or the DM's other members. */
  name: string
}

/** How one destination's messages are going: the comment first, if any, then the forward. */
export type DestinationSend = {
  channelId: string
  status: "sending" | "sent" | "failed"
  /** Made once, so a retry returns what was already sent instead of sending it twice. */
  commentId: string | null
  forwardId: string
  /** The comment went: a retry only sends the forward. */
  commentSent: boolean
  failure?: SendFailure
}

/** What the sends call; the real ones are the messages fetchers. */
export type ForwardApi = {
  sendComment: (channelId: string, body: string, clientMsgId: string) => Promise<unknown>
  forward: (channelId: string, messageId: string, clientMsgId: string) => Promise<unknown>
}
