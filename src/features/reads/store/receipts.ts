// What the ticks on my message say, worked out from the members' read positions (D-19).
// A member has seen a message when their last_read_seq is at least its seq. The author is
// never counted, and a member without a position has seen nothing.

import type { ChannelKind } from "@/features/channels"

import type { Receipt } from "../types"
import type { Positions } from "./reads"

/** The fields of a message that decide its receipt. */
export type ReceiptMessage = {
  author_id: string
  seq: number
  status: "sent" | "pending" | "failed"
  deleted_at: string | null
}

/** Only private channels and DMs have read receipts. */
export function hasReadReceipts(kind: ChannelKind | undefined): boolean {
  return kind === "private" || kind === "dm"
}

/** Ticks go on my own sent messages that aren't deleted, in private channels and DMs. */
export function showsReceipt(
  message: ReceiptMessage,
  myId: string | undefined,
  kind: ChannelKind | undefined,
): boolean {
  return (
    hasReadReceipts(kind) &&
    myId !== undefined &&
    message.author_id === myId &&
    message.status === "sent" &&
    message.deleted_at === null
  )
}

/** The other members, split by whether they have seen the message. Order as in `positions`. */
export function seenBy(
  positions: Positions,
  message: Pick<ReceiptMessage, "author_id" | "seq">,
): { seen: string[]; notSeen: string[] } {
  const seen: string[] = []
  const notSeen: string[] = []
  for (const [userId, lastReadSeq] of Object.entries(positions)) {
    if (userId === message.author_id) continue
    ;(lastReadSeq >= message.seq ? seen : notSeen).push(userId)
  }
  return { seen, notSeen }
}

// One object per (seen, total), so a memoized message row only re-renders when its ticks change.
const receipts = new Map<string, Receipt>()

/**
 * The message's status, the same object for the same counts. Alone in the channel, nobody can
 * see it, so it stays "sent".
 */
export function receiptFor(
  positions: Positions,
  message: Pick<ReceiptMessage, "author_id" | "seq">,
): Receipt {
  const { seen, notSeen } = seenBy(positions, message)
  const total = seen.length + notSeen.length
  const key = `${seen.length}/${total}`
  let receipt = receipts.get(key)
  if (!receipt) {
    const status = seen.length === 0 ? "sent" : notSeen.length === 0 ? "all" : "some"
    receipt = { status, seen: seen.length, total }
    receipts.set(key, receipt)
  }
  return receipt
}

/** What a screen reader says for the ticks: "Sent", "Seen by 2 of 5", "Seen by everyone". */
export function receiptLabel({ status, seen, total }: Receipt): string {
  if (status === "sent") return "Sent"
  if (status === "all") return total === 1 ? "Seen" : "Seen by everyone"
  return `Seen by ${seen} of ${total}`
}
