import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { getTeamsRequest } from "../fetchers/team-fetchers"
import { TeamsContext } from "../hooks/teams-context"
import type { TeamListItem } from "../types"

type TeamsState =
  | { status: "loading" }
  | { status: "loaded"; teams: TeamListItem[] }
  | { status: "error" }

async function fetchTeams(): Promise<TeamsState> {
  try {
    const data = await getTeamsRequest()
    return { status: "loaded", teams: data.teams }
  } catch {
    return { status: "error" }
  }
}

/** Fetches GET /teams and keeps the list available for the team rail and settings. */
export function TeamsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TeamsState>({ status: "loading" })
  // Generation counter: prevent a stale fetch from overwriting a newer reload.
  const generation = useRef(0)

  const load = useCallback(() => {
    const current = ++generation.current
    void fetchTeams().then((next) => {
      if (current === generation.current) setState(next)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const reload = useCallback(() => {
    setState({ status: "loading" })
    load()
  }, [load])

  const value = useMemo(
    () => ({
      teams: state.status === "loaded" ? state.teams : [],
      loading: state.status === "loading",
      reload,
    }),
    [state, reload],
  )

  return <TeamsContext.Provider value={value}>{children}</TeamsContext.Provider>
}
