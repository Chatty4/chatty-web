import { createContext, useContext } from "react"

import type { UnreadCounts } from "../types"

export type UnreadContextValue = {
  /** The active team's counts of one channel; zero until GET /unread answered. */
  getCounts: (channelId: string) => UnreadCounts
  /**
   * Marks the channel as read up to `seq` (POST /channels/{id}/read). Skipped when the
   * channel is known to have nothing unread, or that seq was already sent. Never rejects:
   * a failure is retried on the next call.
   */
  markRead: (channelId: string, seq: number) => void
}

export const UnreadContext = createContext<UnreadContextValue | null>(null)

export function useUnread(): UnreadContextValue {
  const value = useContext(UnreadContext)
  if (!value) throw new Error("useUnread must be used inside UnreadProvider")
  return value
}
