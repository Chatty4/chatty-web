import { useState } from "react"
import { useParams } from "react-router"
import { Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useChannels, ChannelDetailsPanel } from "@/features/channels"
import { MessageList } from "@/features/messages"

export function ChannelPage() {
  const { teamId = "", channelId = "" } = useParams()
  const { channels } = useChannels()
  const channel = channels.find((c) => c.id === channelId) ?? null
  const [showDetails, setShowDetails] = useState(false)

  if (!channelId) return null

  return (
    <div className="flex min-h-0 flex-1">
      {/* Main column: header + messages */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Channel header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              {channel?.name ? `#${channel.name}` : "Channel"}
            </p>
            {channel?.topic && (
              <p className="truncate text-xs text-muted-foreground">{channel.topic}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Channel details"
            aria-pressed={showDetails}
            onClick={() => setShowDetails((v) => !v)}
          >
            <Info className="size-4" />
          </Button>
        </div>

        {/* Messages */}
        <MessageList channelId={channelId} teamId={teamId} channel={channel} />
      </div>

      {/* Details panel */}
      {showDetails && (
        <ChannelDetailsPanel
          channelId={channelId}
          teamId={teamId}
          onClose={() => setShowDetails(false)}
        />
      )}
    </div>
  )
}
