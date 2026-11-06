// Who is online in the active team: GET /teams/{id}/presence once the socket is connected
// (on load, on a team switch and after every reconnect), then the `presence` messages.
//
// Contract: chatty-infra/docs/api-chat.md#get-teams-team_id-presence.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"

import { useActiveTeamId } from "@/features/teams"
import { useWs } from "@/features/ws"
import type { PresenceMessage } from "@/lib/ws/types"

import { getPresenceRequest } from "../fetchers/presence-fetchers"
import { PresenceContext } from "../hooks/presence-context"
import { applyPresence, mergeAnswer } from "../store/presence"

type PresenceState = { forTeamId: string; online: ReadonlySet<string> } | null

export function PresenceProvider({ children }: { children: ReactNode }) {
  const teamId = useActiveTeamId()
  const { status, subscribe } = useWs()
  // Presence messages are lost while the socket is closed, so every (re)connect asks again.
  const connected = status === "connected"

  const [state, setState] = useState<PresenceState>(null)
  const generation = useRef(0)
  // The team being fetched and the messages for it that arrived meanwhile.
  const loadingRef = useRef<{ teamId: string; arrived: PresenceMessage[] } | null>(null)

  const load = useCallback((tid: string) => {
    const current = ++generation.current
    loadingRef.current = { teamId: tid, arrived: [] }
    getPresenceRequest(tid)
      .then(({ online }) => {
        if (current !== generation.current) return
        const arrived = loadingRef.current?.arrived ?? []
        loadingRef.current = null
        setState({ forTeamId: tid, online: mergeAnswer(online, arrived) })
      })
      .catch(() => {
        // No dots until the next team switch or reconnect.
        if (current === generation.current) loadingRef.current = null
      })
  }, [])

  useEffect(() => {
    if (!teamId || !connected) {
      generation.current++
      loadingRef.current = null
      return
    }
    load(teamId)
  }, [teamId, connected, load])

  useEffect(
    () =>
      subscribe((message) => {
        if (message.type !== "presence") return
        if (loadingRef.current?.teamId === message.team_id) loadingRef.current.arrived.push(message)
        setState((current) =>
          current?.forTeamId === message.team_id
            ? { ...current, online: applyPresence(current.online, message) }
            : current,
        )
      }),
    [subscribe],
  )

  const isOnline = (userId: string) =>
    state?.forTeamId === teamId && state.online.has(userId)

  return <PresenceContext.Provider value={{ isOnline }}>{children}</PresenceContext.Provider>
}
