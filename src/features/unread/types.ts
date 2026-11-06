// Read state and unread counts.
// Contract: chatty-infra/docs/api-chat.md#post-channels-channel_id-read and #get-unread.

/** One channel's counts. Both are capped at 100 on the server (the UI shows 99+). */
export type ChannelUnread = {
  channel_id: string
  unread: number
  mentions: number
}

/** GET /unread?team_id= */
export type UnreadResponse = {
  channels: ChannelUnread[]
}

/** POST /channels/{id}/read */
export type MarkReadResponse = ChannelUnread & {
  last_read_seq: number
}

/** The counts of one channel, as the sidebar reads them. */
export type UnreadCounts = {
  unread: number
  mentions: number
}
