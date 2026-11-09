import { useEffect } from "react"

import { useWs } from "@/features/ws"

/**
 * While `active`, the socket watches the channel: the server sends its live events although I
 * haven't joined it. Sent on every (re)connect, because a new socket starts without a watch, and
 * ended with `unwatch` when the channel changes or the page closes.
 */
export function useWatchChannel(channelId: string, active: boolean): void {
  const { status, send, onReconnect } = useWs()
  const connected = status === "connected"

  useEffect(() => {
    if (!active || !connected) return
    const watch = () => send({ type: "watch", channel_id: channelId })
    watch()
    // A reconnect can replace the socket without the status leaving "connected".
    const stopWatchingReconnects = onReconnect(watch)
    return () => {
      stopWatchingReconnects()
      send({ type: "unwatch", channel_id: channelId })
    }
  }, [channelId, active, connected, send, onReconnect])
}
