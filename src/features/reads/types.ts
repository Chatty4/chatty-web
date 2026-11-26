// Read receipts in private channels and DMs (D-19).
// Contract: chatty-infra/docs/api-chat.md#get-channels-channel_id-reads and events.md#ws-read.

/** One member's read position. 0 when they never read the channel. */
export type MemberRead = {
  user_id: string
  last_read_seq: number
}

/** GET /channels/{channel_id}/reads */
export type ChannelReadsResponse = {
  channel_id: string
  last_seq: number
  reads: MemberRead[]
}

/** How far my message got: nobody else saw it yet, some did, or everyone did. */
export type ReceiptStatus = "sent" | "some" | "all"

export type Receipt = {
  status: ReceiptStatus
  /** How many of the other members have seen it. */
  seen: number
  /** How many other members there are (everyone but the author). */
  total: number
}
