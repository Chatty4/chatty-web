import { createContext, useContext } from "react"

import type { ChannelState } from "./types"

export type MessagesContextValue = {
  getChannel: (channelId: string) => ChannelState | undefined
  loadChannel: (channelId: string) => void
  loadMoreHistory: (channelId: string) => Promise<void>
  send: (channelId: string, body: string) => Promise<void>
  retry: (channelId: string, clientMsgId: string) => Promise<void>
  /** PUT /messages/{id}; rejects with ApiError so the editor can stay open on failure. */
  edit: (channelId: string, messageId: string, body: string) => Promise<void>
  /** DELETE /messages/{id}; rejects with ApiError. */
  remove: (channelId: string, messageId: string) => Promise<void>
}

export const MessagesContext = createContext<MessagesContextValue | null>(null)

export function useMessages(): MessagesContextValue {
  const ctx = useContext(MessagesContext)
  if (!ctx) throw new Error("useMessages must be used inside MessagesProvider")
  return ctx
}
