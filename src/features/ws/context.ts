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
   * Replace the cursors (channel_id → last_seen_seq) used in the next POST /sync.
   * Pass every open channel: one left out is no longer synced.
   */
  setCursors: (cursors: SyncCursors) => void
  /**
   * Subscribe to the POST /sync response after every reconnect. Live events stay
   * held back until the returned promise settles. Returns an unsubscribe function.
   */
  onSync: (handler: (response: SyncResponse) => void | Promise<void>) => () => void
}

export const WsContext = createContext<WsContextValue | null>(null)

export function useWs(): WsContextValue {
  const value = useContext(WsContext)
  if (!value) throw new Error("useWs must be used inside WsProvider")
  return value
}
