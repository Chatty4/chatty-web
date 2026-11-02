import { useCallback, useEffect, useRef, useState } from "react"

import {
  createInviteRequest,
  getTeamInvitesRequest,
  revokeInviteRequest,
} from "../fetchers/invite-fetchers"
import type { Invite } from "../types"

export type InvitesState =
  | { status: "loading" }
  | { status: "loaded"; forTeamId: string; invites: Invite[] }
  | { status: "error"; forTeamId: string; message: string }

export function useInvites(teamId: string) {
  const [state, setState] = useState<InvitesState>({ status: "loading" })
  const generation = useRef(0)

  const load = useCallback((tid: string) => {
    const current = ++generation.current
    void getTeamInvitesRequest(tid)
      .then((data) => {
        if (current === generation.current)
          setState({ status: "loaded", forTeamId: tid, invites: data.invites })
      })
      .catch(() => {
        if (current === generation.current)
          setState({ status: "error", forTeamId: tid, message: "Could not load invites." })
      })
  }, [])

  useEffect(() => {
    load(teamId)
  }, [teamId, load])

  const currentState: InvitesState =
    state.status !== "loading" && state.forTeamId !== teamId ? { status: "loading" } : state

  const createInvite = useCallback(
    async (maxAge: number, maxUses: number): Promise<Invite> => {
      const invite = await createInviteRequest(teamId, maxAge, maxUses)
      setState((prev) =>
        prev.status === "loaded" && prev.forTeamId === teamId
          ? { ...prev, invites: [invite, ...prev.invites] }
          : prev,
      )
      return invite
    },
    [teamId],
  )

  const revokeInvite = useCallback(
    async (inviteId: string) => {
      await revokeInviteRequest(inviteId)
      setState((prev) =>
        prev.status === "loaded" && prev.forTeamId === teamId
          ? { ...prev, invites: prev.invites.filter((i) => i.id !== inviteId) }
          : prev,
      )
    },
    [teamId],
  )

  return { state: currentState, createInvite, revokeInvite }
}
