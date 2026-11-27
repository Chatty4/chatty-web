import { useEffect } from "react"
import { useLocation, useParams } from "react-router"

import { pickHomeTeam, readLastTeam, rememberLastTeam } from "../utils/last-team"
import { useTeams } from "./teams-context"

/** The Home page opened from the logo (`/?home`), which shows no team even for someone with teams. */
export function useIsHome(): boolean {
  const { pathname, search } = useLocation()
  return pathname === "/" && new URLSearchParams(search).has("home")
}

/**
 * The team the app is showing: the one in the URL, or on pages outside a team (account
 * settings, new team) the one used last. Empty on Home, for someone with no teams, or while
 * the teams load.
 */
export function useActiveTeamId(): string {
  const { teamId } = useParams()
  const { teams } = useTeams()
  const isHome = useIsHome()

  useEffect(() => {
    if (teamId && teams.some((team) => team.id === teamId)) rememberLastTeam(teamId)
  }, [teamId, teams])

  if (isHome) return ""
  return teamId ?? pickHomeTeam(teams, readLastTeam())?.id ?? ""
}
