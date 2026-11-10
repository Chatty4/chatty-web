// Tells the gateway this socket is alive and whether its tab is on screen.
// The gateway keeps visible tabs in Redis (visible:{user_id}), and the push worker
// sends nothing to a user who is looking (chatty-infra/docs/events.md#ws-heartbeat).

import type { HeartbeatMessage } from "./types"

export const HEARTBEAT_MS = 20_000

type HeartbeatOptions = {
  send: (message: HeartbeatMessage) => void
  /** Read on every beat, so each heartbeat carries the current visibility. */
  isVisible: () => boolean
  intervalMs?: number
}

export type Heartbeat = {
  /**
   * Sends one heartbeat now, then one every 20 s. Call it when the socket opens:
   * without the first beat, a visible tab counts as hidden for 20 s after every
   * (re)connect and the user can get a push while looking.
   */
  start: () => void
  /** Sends one heartbeat now, for example when the tab is shown or hidden. */
  beat: () => void
  stop: () => void
}

export function createHeartbeat({
  send,
  isVisible,
  intervalMs = HEARTBEAT_MS,
}: HeartbeatOptions): Heartbeat {
  let timer: ReturnType<typeof setInterval> | undefined
  const beat = () => send({ type: "heartbeat", visible: isVisible() })

  return {
    start() {
      if (timer !== undefined) return
      beat()
      timer = setInterval(beat, intervalMs)
    },

    beat,

    stop() {
      clearInterval(timer)
      timer = undefined
    },
  }
}
