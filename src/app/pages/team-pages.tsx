import { useEffect } from "react"
import { Link, useNavigate, useParams } from "react-router"

import { Button, buttonVariants } from "@/components/ui/button"
import { useChannels } from "@/features/channels"
import { CreateTeamForm } from "@/features/teams"
import { TeamSettings } from "@/features/teams"

export function CreateTeamPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Create a team</h1>
        <p className="text-sm text-muted-foreground">
          Give your new workspace a clear name. You can always change it later.
        </p>
      </div>
      <CreateTeamForm />
    </div>
  )
}

export function TeamSettingsPage() {
  const { teamId = "" } = useParams()
  return <TeamSettings teamId={teamId} />
}

export function TeamHomePage() {
  const { teamId = "" } = useParams()
  const { channels, loading, failed, reload } = useChannels()
  const navigate = useNavigate()

  // Redirect to the first (default) channel as soon as channels load
  useEffect(() => {
    if (loading || channels.length === 0) return
    const defaultChannel = channels.find((c) => c.is_default) ?? channels[0]
    navigate(`/teams/${teamId}/channels/${defaultChannel.id}`, { replace: true })
  }, [loading, channels, teamId, navigate])

  if (loading) return null

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p role="alert" className="text-lg font-medium">
          Couldn't load this team's channels.
        </p>
        <Button variant="secondary" onClick={reload}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <p className="text-lg font-medium">No channels yet</p>
      <p className="text-sm text-muted-foreground">
        Create your first channel to start collaborating.
      </p>
      <Link to={`/teams/${teamId}/channels/new`} className={buttonVariants()}>
        Create a channel
      </Link>
    </div>
  )
}
