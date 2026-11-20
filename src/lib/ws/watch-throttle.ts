// The gateway takes at most one `watch` per second per socket and ignores the rest without an
// error (chatty-infra/docs/api-chat.md, Rate limits). Opening two public channels quickly would
// leave the socket watching the first, so a watch sent too soon waits for its turn instead.

import type { WatchMessage } from "./types"

/** A little over the gateway's 1 s, so network jitter can't bring two watches closer. */
export const WATCH_INTERVAL_MS = 1_100

export type WatchThrottle = {
  /** Sends the watch now, or when the interval is over. A newer watch replaces a waiting one. */
  watch: (channelId: string) => void
  /** Drops a waiting watch for this channel: it was left before it was sent. */
  unwatch: (channelId: string) => void
  /** For a new socket: the gateway counts per socket. Drops a waiting watch too. */
  reset: () => void
}

export function createWatchThrottle(send: (message: WatchMessage) => void): WatchThrottle {
  let lastSentAt = -Infinity
  let waiting: { channelId: string; timer: ReturnType<typeof setTimeout> } | null = null

  const sendNow = (channelId: string) => {
    lastSentAt = Date.now()
    send({ type: "watch", channel_id: channelId })
  }

  const dropWaiting = () => {
    if (waiting) clearTimeout(waiting.timer)
    waiting = null
  }

  return {
    watch(channelId) {
      dropWaiting()
      const delay = lastSentAt + WATCH_INTERVAL_MS - Date.now()
      if (delay <= 0) {
        sendNow(channelId)
        return
      }
      const timer = setTimeout(() => {
        waiting = null
        sendNow(channelId)
      }, delay)
      waiting = { channelId, timer }
    },

    unwatch(channelId) {
      if (waiting?.channelId === channelId) dropWaiting()
    },

    reset() {
      dropWaiting()
      lastSentAt = -Infinity
    },
  }
}
