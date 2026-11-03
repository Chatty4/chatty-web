import { useParams, useSearchParams } from "react-router"

import { ChannelDetailsPanel, useChannels } from "@/features/channels"
import { MessageList } from "@/features/messages"

export function ChannelPage() {
  const { teamId = "", channelId = "" } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { channels } = useChannels()
  const channel = channels.find((c) => c.id === channelId) ?? null
  const showDetails = searchParams.has("details")

  if (!channelId) return null

  return (
    <div className="flex min-h-0 flex-1">
      <div className="relative flex min-w-0 flex-1 flex-col">
        <MessageList channelId={channelId} teamId={teamId} channel={channel} />
      </div>
      {showDetails && (
        <ChannelDetailsPanel
          key={channelId}
          channelId={channelId}
          teamId={teamId}
          onClose={() =>
            setSearchParams(
              (prev) => {
                prev.delete("details")
                return prev
              },
              { replace: true },
            )
          }
        />
      )}
    </div>
  )
}
