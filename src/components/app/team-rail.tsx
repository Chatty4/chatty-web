import { Bell, MessageCircle, Plus } from "lucide-react"
import { Link, useMatches } from "react-router"

import { cn } from "@/lib/utils"
import { useTeams } from "@/features/teams"

function useActiveTeamId(): string | null {
  const matches = useMatches()
  for (let i = matches.length - 1; i >= 0; i--) {
    const id = matches[i].params?.teamId
    if (id) return id
  }
  return null
}

const tileBase =
  "grid size-[34px] shrink-0 place-items-center rounded-md text-[12px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"

/** The narrow column on the left: brand mark, one tile per team, create team, and a bell. */
export function TeamRail() {
  const { teams } = useTeams()
  const activeTeamId = useActiveTeamId()

  return (
    <aside
      aria-label="Teams"
      className="z-20 hidden w-16 shrink-0 flex-col items-center gap-2 border-r bg-background px-2.5 py-3 md:flex"
    >
      {/* Brand mark */}
      <Link
        to="/"
        aria-label="Chatty home"
        className={cn(tileBase, "bg-accent text-primary hover:text-primary focus-visible:text-primary")}
      >
        <MessageCircle className="size-5" strokeWidth={2.2} />
      </Link>

      <div className="my-0.5 h-px w-7 bg-border" />

      {teams.map((team) => {
        const isActive = team.id === activeTeamId
        return (
          <Link
            key={team.id}
            to={`/teams/${team.id}`}
            aria-label={team.name}
            title={team.name}
            className={cn(
              tileBase,
              "border",
              isActive
                ? "border-primary bg-primary text-primary-foreground hover:bg-primary-hover"
                : "border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground",
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
        className={cn(tileBase, "border border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground")}
      >
        <Plus className="size-4" />
      </Link>

      {/* Push bell to the bottom */}
      <div className="flex-1" />

      <button
        type="button"
        aria-label="Notifications"
        onClick={() => {/* notifications — future ticket */}}
        className={cn(tileBase, "text-muted-foreground hover:bg-surface-hover hover:text-foreground")}
      >
        <Bell className="size-[18px]" />
      </button>
    </aside>
  )
}
