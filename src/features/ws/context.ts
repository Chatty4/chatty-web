import { createContext, useContext } from "react"
import type { InboundWsMessage, OutboundWsMessage } from "@/lib/ws/types"
import type { SyncCursors, SyncResponse, WsStatus } from "./types"

export type WsContextValue = {
  status: WsStatus
  /** Send a message to the server. Noop when the socket is not open. */
  send: (msg: OutboundWsMessage) => void
  /**
   * Subscribe to all inbound messages, including those buffered during a
   * reconnect and released after POST /sync completes. Returns an unsubscribe
   * function.
   */
  subscribe: (handler: (msg: InboundWsMessage) => void) => () => void
  /**
   * Register cursors (channel_id → last_seen_seq) used in the next POST /sync.
   * Merge with the existing map — pass an empty object to clear all cursors.
   * Called by the sync store (CHAT-199) as channels are loaded and updated.
   */
  setCursors: (cursors: SyncCursors) => void
  /**
   * Subscribe to the POST /sync response after every reconnect. Returns an
   * unsubscribe function. Called by the sync store (CHAT-199) to apply missed
   * events and handle gap_too_large / cannot_read_channel.
   */
  onSync: (handler: (response: SyncResponse) => void) => () => void
}

export const WsContext = createContext<WsContextValue | null>(null)

export function useWs(): WsContextValue {
  const value = useContext(WsContext)
  if (!value) throw new Error("useWs must be used inside WsProvider")
  return value
}
