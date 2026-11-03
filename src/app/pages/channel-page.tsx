import { useParams, useSearchParams } from "react-router"

import { useAuth } from "@/features/auth"
import {
  ChannelDetailsPanel,
  dmDisplayName,
  useChannels,
  type ChannelDetailsTab,
  type SidebarChannel,
} from "@/features/channels"
import { ChannelIntro, MessageList } from "@/features/messages"
import { useTeams } from "@/features/teams"

const DETAILS_TABS: ChannelDetailsTab[] = ["about", "members", "notifications", "archive"]

export function ChannelPage() {
  const { teamId = "", channelId = "" } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { channels, dms, memberNames, reload } = useChannels()
  const { teams } = useTeams()
  const channel = [...channels, ...dms].find((c) => c.id === channelId) ?? null
  const teamRole = teams.find((t) => t.id === teamId)?.role ?? null

  const detailsParam = searchParams.get("details")
  const showDetails = detailsParam !== null
  const detailsTab = DETAILS_TABS.find((t) => t === detailsParam) ?? "about"

  const setDetails = (tab: ChannelDetailsTab | null) =>
    setSearchParams(
      (prev) => {
        if (tab) prev.set("details", tab)
        else prev.delete("details")
        return prev
      },
      { replace: true },
    )

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
          intro={
            channel && (
              <Intro
                channel={channel}
                dmName={dmDisplayName(channel.dm_member_ids ?? [], user?.id ?? "", memberNames)}
                onManagePeople={() => setDetails("members")}
              />
            )
          }
        />
      </div>
      {showDetails && (
        <ChannelDetailsPanel
          key={`${channelId}:${detailsTab}`}
          channelId={channelId}
          teamId={teamId}
          initialTab={detailsTab}
          onClose={() => setDetails(null)}
        />
      )}
    </div>
  )
}

function Intro({
  channel,
  dmName,
  onManagePeople,
}: {
  channel: SidebarChannel
  dmName: string
  onManagePeople: () => void
}) {
  if (channel.kind === "dm") return <ChannelIntro kind="dm" name={dmName} />
  return (
    <ChannelIntro
      kind={channel.kind}
      name={channel.name ?? ""}
      topic={channel.topic}
      onManagePeople={onManagePeople}
    />
  )
}
