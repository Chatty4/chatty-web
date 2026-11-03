import { useParams } from "react-router"

import { useChannels } from "@/features/channels"
import { MessageList } from "@/features/messages"

export function ChannelPage() {
  const { teamId = "", channelId = "" } = useParams()
  const { channels } = useChannels()
  const channel = channels.find((c) => c.id === channelId) ?? null

  if (!channelId) return null

  return (
    <MessageList channelId={channelId} teamId={teamId} channel={channel} />
  )
}
