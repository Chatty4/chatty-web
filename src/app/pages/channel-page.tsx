import { useParams, useSearchParams } from "react-router"

import { ChannelDetailsPanel, useChannels } from "@/features/channels"
import { MessageList } from "@/features/messages"
import { useTeams } from "@/features/teams"

export function ChannelPage() {
  const { teamId = "", channelId = "" } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { channels, dms, reload } = useChannels()
  const { teams } = useTeams()
  const channel = [...channels, ...dms].find((c) => c.id === channelId) ?? null
  const teamRole = teams.find((t) => t.id === teamId)?.role ?? null
  const showDetails = searchParams.has("details")

  if (!channelId) return null

  return (
    <div className="flex min-h-0 flex-1">
      <div className="relative flex min-w-0 flex-1 flex-col">
        <MessageList
          channelId={channelId}
          teamId={teamId}
          channel={channel}
          teamRole={teamRole}
          onChannelArchived={reload}
        />
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
