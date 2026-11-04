import { useEffect } from "react"

import { useMessages } from "../context"
import type { PinsState } from "../types"

/**
 * The channel's pins. Fetches them once the channel has loaded, and again when the store
 * marks them stale; events keep them current in between. Safe to call from several places.
 */
export function usePins(channelId: string | undefined): PinsState | undefined {
  const { getChannel, loadPins } = useMessages()
  const channel = channelId ? getChannel(channelId) : undefined
  const pins = channel?.pins
  const needsLoad =
    !!channel && !channel.loading && (!pins || (pins.stale && pins.status !== "loading"))

  useEffect(() => {
    if (needsLoad && channelId) void loadPins(channelId)
  }, [needsLoad, channelId, loadPins])

  return pins
}
