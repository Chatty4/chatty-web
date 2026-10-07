import { useParams } from "react-router"

import { PagePlaceholder } from "@/components/PagePlaceholder"

export function ChannelPage() {
  const { teamId, channelId } = useParams()

  return (
    <PagePlaceholder title="Channel">
      <p className="text-sm">
        Team <code>{teamId}</code>, channel <code>{channelId}</code>
      </p>
    </PagePlaceholder>
  )
}
