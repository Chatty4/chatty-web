import { Navigate, useParams } from "react-router"

import { BrowseChannelsPage } from "@/features/channels"
import { CreateChannelForm } from "@/features/channels"
import { StartDmPage } from "@/features/channels"

export function CreateChannelPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Create a channel</h1>
        <p className="text-sm text-muted-foreground">
          Channels are where your team communicates. Give yours a clear, lowercase name.
        </p>
      </div>
      <CreateChannelForm />
    </div>
  )
}

export { BrowseChannelsPage, StartDmPage }

/** Channel settings live in the details panel on the channel view. */
export function ChannelSettingsPage() {
  const { teamId = "", channelId = "" } = useParams()
  return <Navigate to={`/teams/${teamId}/channels/${channelId}?details`} replace />
}
