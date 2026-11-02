import { useParams } from "react-router"

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
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-lg font-medium">Welcome to your team</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Channels are coming in the next update.
      </p>
    </div>
  )
}
