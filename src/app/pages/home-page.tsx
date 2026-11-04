import type { ReactNode } from "react"
import { Link as LinkIcon, MessageCircle, Users } from "lucide-react"
import { Link, Navigate } from "react-router"

import { Button, buttonVariants } from "@/components/ui/button"
import { useAuth } from "@/features/auth"
import { JoinInviteForm } from "@/features/invites/ui/join-invite-form"
import { pickHomeTeam, readLastTeam, useTeams } from "@/features/teams"

function StartCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border bg-surface p-[18px] text-left">
      <div className="grid size-9 place-items-center rounded-md bg-accent text-primary">{icon}</div>
      <div className="flex flex-col gap-0.5">
        <strong className="text-sm font-semibold">{title}</strong>
        <span className="text-[13px] text-muted-foreground">{description}</span>
      </div>
      <div className="mt-auto">{children}</div>
    </div>
  )
}

/** Root route: opens the last used team, so only someone with no teams stays here. */
export function HomePage() {
  const { user } = useAuth()
  const { teams, loading, failed, reload } = useTeams()
  const homeTeam = pickHomeTeam(teams, readLastTeam())

  if (homeTeam) return <Navigate to={`/teams/${homeTeam.id}`} replace />
  if (loading) return null

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
    <section className="mx-auto flex max-w-[600px] flex-col items-center gap-6 py-6 text-center md:py-12">
      <div className="grid size-12 place-items-center rounded-md bg-accent text-primary">
        <MessageCircle className="size-6" strokeWidth={2.2} aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          Welcome{user ? `, ${user.display_name}` : ""}
        </h1>
        <p className="text-muted-foreground">
          Conversations in Chatty happen inside a team. Start one, or join the team that invited
          you.
        </p>
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-2">
        <StartCard
          icon={<Users className="size-[18px]" aria-hidden="true" />}
          title="Create a team"
          description="Start a workspace and invite the people you work with."
        >
          <Link to="/teams/new" className={buttonVariants({ className: "w-full" })}>
            Create a team
          </Link>
        </StartCard>
        <StartCard
          icon={<LinkIcon className="size-[18px]" aria-hidden="true" />}
          title="Join with an invite"
          description="Someone sent you a link? Paste it here."
        >
          <JoinInviteForm />
        </StartCard>
      </div>
    </section>
  )
}
