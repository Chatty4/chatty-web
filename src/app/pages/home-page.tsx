import { Link } from "react-router"

import { buttonVariants } from "@/components/ui/button"
import { useAuth } from "@/features/auth"
import { useTeams } from "@/features/teams"

/** Root route: shown when the user has no teams or hasn't selected one yet. */
export function HomePage() {
  const { user } = useAuth()
  const { teams } = useTeams()

  return (
    <section className="flex flex-col gap-4 rounded-md border bg-surface p-[22px]">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-[-0.02em]">
          Welcome{user ? `, ${user.display_name}` : ""}
        </h1>
        <p className="text-muted-foreground">
          {teams.length > 0
            ? "Select a team from the rail on the left to get started."
            : "You're not in any teams yet. Create one to get started."}
        </p>
      </div>
      {teams.length === 0 && (
        <div>
          <Link to="/teams/new" className={buttonVariants()}>
            Create a team
          </Link>
        </div>
      )}
    </section>
  )
}
