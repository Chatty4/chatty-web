// Unread counts of the active team's channels: GET /unread on load, on a team switch and
// after every reconnect; `unread` messages from my other tabs; new messages counted here.
//
// Contract: chatty-infra/docs/api-chat.md#get-unread and docs/events.md#ws-unread.

import { useCallback, useEffect, useReducer, useRef, type ReactNode } from "react"

import { useAuth } from "@/features/auth"
import { useActiveTeamId } from "@/features/teams"
import { useWs } from "@/features/ws"

import { getUnreadRequest, markReadRequest } from "../fetchers/unread-fetchers"
import { UnreadContext } from "../hooks/unread-context"
import {
  countNewMessage,
  EMPTY_COUNTS,
  replaceCounts,
  selectCounts,
  setChannelCounts,
  type UnreadState,
} from "../store/unread"

export function UnreadProvider({ children }: { children: ReactNode }) {
  const teamId = useActiveTeamId()
  const { user } = useAuth()
  const { subscribe, onReconnect } = useWs()

  // A ref, not state: markRead runs from a child's effect, before this provider's effects,
  // and must see the count of a message that arrived in the same render.
  const stateRef = useRef<UnreadState>({})
  const [, bump] = useReducer((n: number) => n + 1, 0)
  const update = useCallback((change: (state: UnreadState) => UnreadState) => {
    const next = change(stateRef.current)
    if (next === stateRef.current) return
    stateRef.current = next
    bump()
  }, [])

  const userIdRef = useRef(user?.id)
  useEffect(() => { userIdRef.current = user?.id }, [user?.id])

  // ── GET /unread ──────────────────────────────────────────────────────────────
  const loadedForRef = useRef("")
  const generation = useRef(0)

  const load = useCallback(
    (tid: string) => {
      const current = ++generation.current
      getUnreadRequest(tid)
        .then(({ channels }) => {
          if (current !== generation.current) return
          loadedForRef.current = tid
          update((state) => replaceCounts(state, channels))
        })
        .catch(() => {
          // The old counts stay until the next team switch or reconnect.
        })
    },
    [update],
  )

  useEffect(() => {
    if (!teamId) {
      generation.current++
      return
    }
    load(teamId)
  }, [teamId, load])

  const teamIdRef = useRef(teamId)
  useEffect(() => { teamIdRef.current = teamId }, [teamId])

  // `unread` messages aren't stored, so the ones sent while the socket was closed are lost.
  useEffect(
    () =>
      onReconnect(() => {
        if (teamIdRef.current) load(teamIdRef.current)
      }),
    [onReconnect, load],
  )

  // ── Live messages ──────────────────────────────────────────────────────────────
  useEffect(
    () =>
      subscribe((message) => {
        if (message.type === "unread") {
          update((state) => setChannelCounts(state, message))
        } else if (message.type === "event" && userIdRef.current) {
          const userId = userIdRef.current
          update((state) => countNewMessage(state, message.event, userId))
        }
      }),
    [subscribe, update],
  )

  // ── POST /channels/{id}/read ─────────────────────────────────────────────────
  // channel_id → the highest seq sent, so scrolling doesn't send the same read twice.
  const sentRef = useRef<Record<string, number>>({})

  const markRead = useCallback(
    (channelId: string, seq: number) => {
      if (seq <= 0 || seq <= (sentRef.current[channelId] ?? 0)) return
      // A channel GET /unread didn't list yet (joined since) is sent anyway.
      if (stateRef.current[channelId]?.unread === 0) return
      sentRef.current[channelId] = seq

      markReadRequest(channelId, seq)
        .then((response) => update((state) => setChannelCounts(state, response)))
        .catch(() => {
          // Let the next call try again.
          if (sentRef.current[channelId] === seq) delete sentRef.current[channelId]
        })
    },
    [update],
  )

  // Until the new team's GET /unread answers, the old team's counts would be wrong here.
  const getCounts = (channelId: string) =>
    loadedForRef.current === teamId ? selectCounts(stateRef.current, channelId) : EMPTY_COUNTS

  return (
    <UnreadContext.Provider value={{ getCounts, markRead }}>
      {children}
    </UnreadContext.Provider>
  )
}
