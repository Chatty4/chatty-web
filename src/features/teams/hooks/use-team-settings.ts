import { useCallback, useEffect, useRef, useState } from "react"

import {
  changeRoleRequest,
  deleteTeamRequest,
  getTeamMembersRequest,
  getTeamRequest,
  leaveTeamRequest,
  removeMemberRequest,
  updateTeamRequest,
} from "../fetchers/team-fetchers"
import type { Role, Team, TeamMember } from "../types"
import { useTeams } from "./teams-context"

export type SettingsState =
  | { status: "loading" }
  | { status: "loaded"; forTeamId: string; team: Team; members: TeamMember[] }
  | { status: "error"; forTeamId: string; message: string }

async function fetchSettings(teamId: string): Promise<SettingsState> {
  try {
    const [team, membersPage] = await Promise.all([
      getTeamRequest(teamId),
      getTeamMembersRequest(teamId),
    ])
    return { status: "loaded", forTeamId: teamId, team, members: membersPage.members }
  } catch {
    return { status: "error", forTeamId: teamId, message: "Could not load team settings. Try again." }
  }
}

/** Loads the full team + members for the settings page and provides mutation functions. */
export function useTeamSettings(teamId: string) {
  const { reload: reloadTeamList } = useTeams()
  const [state, setState] = useState<SettingsState>({ status: "loading" })
  const generation = useRef(0)

  const load = useCallback(() => {
    const current = ++generation.current
    void fetchSettings(teamId).then((next) => {
      if (current === generation.current) setState(next)
    })
  }, [teamId])

  useEffect(() => {
    load()
  }, [load])

  // A state from a previous teamId is treated as loading by callers.
  const currentState: SettingsState =
    state.status !== "loading" && state.forTeamId !== teamId ? { status: "loading" } : state

  /** iconFileId: the current team's icon — pass from the loaded state to preserve it on rename. */
  const renameTeam = useCallback(
    async (name: string, iconFileId: string | null) => {
      const updated = await updateTeamRequest(teamId, name, iconFileId)
      setState((prev) =>
        prev.status === "loaded" && prev.forTeamId === teamId ? { ...prev, team: updated } : prev,
      )
      reloadTeamList()
    },
    [teamId, reloadTeamList],
  )

  /** Deletes the team. Caller must navigate away afterwards. */
  const deleteTeam = useCallback(async () => {
    await deleteTeamRequest(teamId)
    reloadTeamList()
  }, [teamId, reloadTeamList])

  /** Leaves the team. Caller must navigate away afterwards. */
  const leaveTeam = useCallback(async () => {
    await leaveTeamRequest(teamId)
    reloadTeamList()
  }, [teamId, reloadTeamList])

  const changeRole = useCallback(
    async (userId: string, role: Role) => {
      await changeRoleRequest(teamId, userId, role)
      setState((prev) =>
        prev.status === "loaded"
          ? { ...prev, members: prev.members.map((m) => (m.user_id === userId ? { ...m, role } : m)) }
          : prev,
      )
    },
    [teamId],
  )

  const removeMember = useCallback(
    async (userId: string) => {
      await removeMemberRequest(teamId, userId)
      setState((prev) =>
        prev.status !== "loaded"
          ? prev
          : {
              ...prev,
              team: { ...prev.team, member_count: prev.team.member_count - 1 },
              members: prev.members.filter((m) => m.user_id !== userId),
            },
      )
    },
    [teamId],
  )

  return { state: currentState, renameTeam, deleteTeam, leaveTeam, changeRole, removeMember }
}
