import { Plus } from "lucide-react"
import { Link, useMatches } from "react-router"

import { cn } from "@/lib/utils"
import { useTeams } from "@/features/teams"

import { BrandMark } from "./brand-mark"

function useActiveTeamId(): string | null {
  const matches = useMatches()
  for (let i = matches.length - 1; i >= 0; i--) {
    const id = matches[i].params?.teamId
    if (id) return id
  }
  return null
}

/** The narrow column on the left: brand mark, one tile per team, and a create-team button. */
export function TeamRail() {
  const { teams } = useTeams()
  const activeTeamId = useActiveTeamId()

  return (
    <aside
      aria-label="Teams"
      className="z-20 hidden w-16 shrink-0 flex-col items-center gap-2 border-r bg-background px-2.5 py-3 md:flex"
    >
      <Link
        to="/"
        aria-label="Chatty home"
        className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BrandMark className="size-[34px] rounded-sm" />
      </Link>

      {teams.length > 0 && <div className="my-0.5 h-px w-7 bg-border" />}

      {teams.map((team) => {
        const isActive = team.id === activeTeamId
        return (
          <Link
            key={team.id}
            to={`/teams/${team.id}`}
            aria-label={team.name}
            title={team.name}
            className={cn(
              "grid size-[34px] shrink-0 place-items-center rounded-md text-[13px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-surface-subtle text-muted-foreground hover:bg-surface-hover hover:text-foreground",
            )}
          >
            {team.name.slice(0, 1).toUpperCase()}
          </Link>
        )
      })}

      <Link
        to="/teams/new"
        aria-label="Create team"
        title="Create team"
        className="grid size-[34px] shrink-0 place-items-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="size-4" />
      </Link>
    </aside>
  )
}
