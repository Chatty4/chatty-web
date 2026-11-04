import { Link } from "react-router"

import { Button, buttonVariants } from "@/components/ui/button"
import { useAuth } from "@/features/auth"
import { useTeams } from "@/features/teams"

/** Root route: shown when the user has no teams or hasn't selected one yet. */
export function HomePage() {
  const { user } = useAuth()
  const { teams, loading, failed, reload } = useTeams()

  if (failed) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-md border bg-surface p-[22px]">
        <p role="alert" className="text-muted-foreground">
          Couldn't load your teams. Check your connection and try again.
        </p>
        <Button variant="secondary" onClick={reload}>
          Try again
        </Button>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4 rounded-md border bg-surface p-[22px]">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-[-0.02em]">
          Welcome{user ? `, ${user.display_name}` : ""}
        </h1>
        <p className="text-muted-foreground">
          {loading || teams.length > 0
            ? "Select a team from the rail on the left to get started."
            : "You're not in any teams yet. Create one to get started."}
        </p>
      </div>
      {!loading && teams.length === 0 && (
        <div>
          <Link to="/teams/new" className={buttonVariants()}>
            Create a team
          </Link>
        </div>
      )}
    </section>
  )
}
