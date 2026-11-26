// Read positions of the private channels and DMs on screen (D-19): GET /reads when one opens,
// after every reconnect and when I change its members; `read` messages in between.
//
// Contract: chatty-infra/docs/api-chat.md#get-channels-channel_id-reads and events.md#ws-read.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"

import { subscribeMembersChanged } from "@/features/channels"
import { useWs } from "@/features/ws"
import { isRateLimited } from "@/lib/api"
import { retryAfterMs } from "@/lib/ws/backoff"

import { getChannelReadsRequest } from "../fetchers/reads-fetchers"
import { ReadsContext } from "../hooks/reads-context"
import {
  applyRead,
  closeChannel,
  loadedPositions,
  openChannel,
  replaceReads,
  type ReadsState,
} from "../store/reads"

/** How long to wait after a 429 that didn't say. */
const RATE_LIMIT_FALLBACK_MS = 30_000

export function ReadsProvider({ children }: { children: ReactNode }) {
  const { subscribe, onReconnect } = useWs()
  const [state, setState] = useState<ReadsState>({})

  // channel_id → how many screens follow it; the same channel can be shown twice.
  const openRef = useRef(new Map<string, number>())
  // channel_id → the number of its latest GET /reads, so an older answer is dropped.
  const requestRef = useRef(new Map<string, number>())
  const retryTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  // The retry after a 429 calls the latest `load`, which can't refer to itself.
  const loadRef = useRef<(channelId: string) => void>(() => {})

  const cancelRetry = useCallback((channelId: string) => {
    clearTimeout(retryTimersRef.current.get(channelId))
    retryTimersRef.current.delete(channelId)
  }, [])

  const load = useCallback(
    (channelId: string) => {
      cancelRetry(channelId)
      const request = (requestRef.current.get(channelId) ?? 0) + 1
      requestRef.current.set(channelId, request)
      const isCurrent = () =>
        openRef.current.has(channelId) && requestRef.current.get(channelId) === request

      getChannelReadsRequest(channelId)
        .then(({ reads }) => {
          if (isCurrent()) setState((current) => replaceReads(current, channelId, reads))
        })
        .catch((error: unknown) => {
          if (!isCurrent()) return
          if (isRateLimited(error)) {
            const delay = retryAfterMs(error) || RATE_LIMIT_FALLBACK_MS
            const timer = setTimeout(() => loadRef.current(channelId), delay)
            retryTimersRef.current.set(channelId, timer)
            return
          }
          // No ticks rather than wrong ones: positions from before may be out of date.
          setState((current) => openChannel(closeChannel(current, channelId), channelId))
        })
    },
    [cancelRetry],
  )
  useEffect(() => { loadRef.current = load }, [load])

  const track = useCallback(
    (channelId: string) => {
      const open = openRef.current
      const count = open.get(channelId) ?? 0
      open.set(channelId, count + 1)
      if (count === 0) {
        setState((current) => openChannel(current, channelId))
        load(channelId)
      }

      return () => {
        const left = (open.get(channelId) ?? 1) - 1
        if (left > 0) {
          open.set(channelId, left)
          return
        }
        open.delete(channelId)
        requestRef.current.delete(channelId)
        cancelRetry(channelId)
        setState((current) => closeChannel(current, channelId))
      }
    },
    [load, cancelRetry],
  )

  // `read` messages aren't stored, so the ones sent while the socket was closed are lost.
  useEffect(
    () => onReconnect(() => openRef.current.forEach((_, channelId) => load(channelId))),
    [onReconnect, load],
  )

  // Members I added or removed from the channel's Members tab.
  useEffect(
    () =>
      subscribeMembersChanged((channelId) => {
        if (openRef.current.has(channelId)) load(channelId)
      }),
    [load],
  )

  useEffect(
    () =>
      subscribe((message) => {
        if (message.type !== "read") return
        const { channel_id, user_id, last_read_seq } = message
        setState((current) => applyRead(current, channel_id, user_id, last_read_seq))
      }),
    [subscribe],
  )

  useEffect(() => {
    const timers = retryTimersRef.current
    return () => timers.forEach(clearTimeout)
  }, [])

  const positionsOf = useCallback(
    (channelId: string) => loadedPositions(state, channelId),
    [state],
  )

  return <ReadsContext.Provider value={{ track, positionsOf }}>{children}</ReadsContext.Provider>
}
