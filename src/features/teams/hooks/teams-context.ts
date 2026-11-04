import { createContext, useContext } from "react"

import type { TeamListItem } from "../types"

export type TeamsContextValue = {
  /** The current user's teams, loaded from GET /teams. */
  teams: TeamListItem[]
  loading: boolean
  /** The list couldn't be fetched: not the same as having no teams. */
  failed: boolean
  /** Re-fetch GET /teams. Call after any mutation that adds, removes or renames a team. */
  reload: () => void
}

export const TeamsContext = createContext<TeamsContextValue | null>(null)

export function useTeams(): TeamsContextValue {
  const value = useContext(TeamsContext)
  if (!value) throw new Error("useTeams must be used inside TeamsProvider")
  return value
}
