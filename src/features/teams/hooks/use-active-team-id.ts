import { useEffect } from "react"
import { useParams } from "react-router"

import { pickHomeTeam, readLastTeam, rememberLastTeam } from "../utils/last-team"
import { useTeams } from "./teams-context"

/**
 * The team the app is showing: the one in the URL, or on pages outside a team (account
 * settings, new team) the one used last. Empty only for someone with no teams, or while
 * the teams load.
 */
export function useActiveTeamId(): string {
  const { teamId } = useParams()
  const { teams } = useTeams()

  useEffect(() => {
    if (teamId) rememberLastTeam(teamId)
  }, [teamId])

  return teamId ?? pickHomeTeam(teams, readLastTeam())?.id ?? ""
}
