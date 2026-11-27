import { Navigate, Outlet, useParams } from "react-router"

import { useTeams } from "@/features/teams"

/**
 * Pages inside a team. A team the user isn't in (left, removed, or an old URL from the
 * browser's history) sends them home, which opens a team they are in.
 */
export function RequireTeam() {
  const { teamId } = useParams()
  const { teams, loading, failed } = useTeams()

  if (loading) return null
  // A failed list proves nothing about membership: let the pages show their own errors.
  if (!failed && !teams.some((team) => team.id === teamId)) return <Navigate to="/" replace />

  return <Outlet />
}
