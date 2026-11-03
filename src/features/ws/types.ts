import type { ChannelEvent } from "@/lib/ws/types"

export type WsStatus = "connecting" | "connected" | "reconnecting" | "disconnected"

/** channel_id → last applied seq */
export type SyncCursors = Record<string, number>

export type SyncChannelOk = {
  events: ChannelEvent[]
  last_seq: number
  gap_too_large?: boolean
}

export type SyncChannelError = {
  error: "cannot_read_channel" | "channel_not_found"
}

export type SyncChannelResult = SyncChannelOk | SyncChannelError

export type SyncResponse = {
  channels: Record<string, SyncChannelResult>
}
