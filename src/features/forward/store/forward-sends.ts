// The sends of one forward: per destination, the comment (if any) as a normal message, then the
// forward. Each message gets its client_msg_id once, so a retry never sends one twice.

import { uuid } from "@/lib/uuid"

import type { DestinationSend, ForwardApi } from "../types"
import { describeForwardFailure } from "../utils/errors"

export type ForwardJob = {
  messageId: string
  /** Sent before the forward in every destination; empty for none. */
  comment: string
}

/** A send for each destination, all starting. */
export function planSends(
  channelIds: string[],
  comment: string,
  makeId: () => string = uuid,
): Record<string, DestinationSend> {
  const hasComment = comment.trim() !== ""
  return Object.fromEntries(
    channelIds.map((channelId) => [
      channelId,
      {
        channelId,
        status: "sending",
        commentId: hasComment ? makeId() : null,
        forwardId: makeId(),
        commentSent: false,
      } satisfies DestinationSend,
    ]),
  )
}

/**
 * Sends what is still missing for one destination: the comment unless it already went, then the
 * forward. Never rejects: a failure is in the result, with the comment's progress kept.
 */
export async function runSend(
  send: DestinationSend,
  job: ForwardJob,
  api: ForwardApi,
): Promise<DestinationSend> {
  let commentSent = send.commentSent
  try {
    if (send.commentId && !commentSent) {
      await api.sendComment(send.channelId, job.comment, send.commentId)
      commentSent = true
    }
    await api.forward(send.channelId, job.messageId, send.forwardId)
    return { ...send, commentSent, status: "sent", failure: undefined }
  } catch (error) {
    return { ...send, commentSent, status: "failed", failure: describeForwardFailure(error) }
  }
}

/** True once every destination got its messages. */
export function allSent(sends: Record<string, DestinationSend>): boolean {
  const all = Object.values(sends)
  return all.length > 0 && all.every((send) => send.status === "sent")
}
