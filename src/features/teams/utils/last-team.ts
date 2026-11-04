// The team to show when the URL names none, such as after login. Only a convenience for this
// browser: the id is checked against the user's teams, so a stale one just falls back.

import type { TeamListItem } from "../types"

const STORAGE_KEY = "chatty:last-team"

export function readLastTeam(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function rememberLastTeam(teamId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, teamId)
  } catch {
    // storage blocked: the first team is used instead
  }
}

/** The team last used, if the user is still in it, otherwise their first team. */
export function pickHomeTeam(
  teams: TeamListItem[],
  lastTeamId: string | null,
): TeamListItem | undefined {
  return teams.find((team) => team.id === lastTeamId) ?? teams[0]
}
