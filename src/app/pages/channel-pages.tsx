import { useParams } from "react-router"

import { BrowseChannelsPage } from "@/features/channels"
import { CreateChannelForm } from "@/features/channels"
import { StartDmPage } from "@/features/channels"
import { ChannelSettings } from "@/features/channels"

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

export function ChannelSettingsPage() {
  const { channelId = "" } = useParams()
  return <ChannelSettings channelId={channelId} />
}
