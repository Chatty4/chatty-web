import { createContext, useContext } from "react"

import type { SidebarChannel } from "../types"

export type ChannelsContextValue = {
  /** Public and private channels the user has joined (kind !== "dm", not hidden). */
  channels: SidebarChannel[]
  /** Direct messages the user has open (kind === "dm", not hidden). */
  dms: SidebarChannel[]
  /** userId → displayName map, resolved from DM participants. */
  memberNames: Record<string, string>
  loading: boolean
  reload: () => void
}

export const ChannelsContext = createContext<ChannelsContextValue | null>(null)

export function useChannels(): ChannelsContextValue {
  const value = useContext(ChannelsContext)
  if (!value) throw new Error("useChannels must be used inside ChannelsProvider")
  return value
}
