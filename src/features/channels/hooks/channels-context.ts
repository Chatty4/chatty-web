import { createContext, useContext } from "react"

import type { SidebarChannel } from "../types"

export type ChannelsContextValue = {
  /** Public and private channels the user has joined (kind !== "dm", not hidden). */
  channels: SidebarChannel[]
  /** Direct messages the user has open (kind === "dm", not hidden), newest message first. */
  dms: SidebarChannel[]
  /** userId → displayName map, resolved from DM participants. */
  memberNames: Record<string, string>
  /** userId → avatar file, from the same member previews as the names. */
  memberAvatars: Record<string, string | null>
  loading: boolean
  /** The list couldn't be fetched: not the same as a team with no channels. */
  failed: boolean
  reload: () => void
  /** DMs I hid. One with unread messages should be shown again with `showDm` (D-04). */
  hiddenDms: SidebarChannel[]
  /** Hides a DM from my sidebar until it gets an unread message. Rejects with ApiError. */
  hideDm: (channelId: string) => Promise<void>
  /** Shows a hidden DM again, here and on my other devices. */
  showDm: (channelId: string) => void
}

export const ChannelsContext = createContext<ChannelsContextValue | null>(null)

export function useChannels(): ChannelsContextValue {
  const value = useContext(ChannelsContext)
  if (!value) throw new Error("useChannels must be used inside ChannelsProvider")
  return value
}
