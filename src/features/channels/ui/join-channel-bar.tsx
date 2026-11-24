import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { toast } from "@/lib/toast"

import { getChannelRequest, joinChannelRequest } from "../fetchers/channel-fetchers"
import { useChannels } from "../hooks/channels-context"
import { describeChannelError } from "../utils/errors"

export type JoinChannelBarProps = {
  channelId: string
}

/**
 * In place of the composer, in a public channel I can read but haven't joined: only members can
 * send (api-chat.md, POST /channels/{id}/messages). Joining reloads the sidebar, which lists the
 * channel, so the composer takes this bar's place.
 */
export function JoinChannelBar({ channelId }: JoinChannelBarProps) {
  const { reload } = useChannels()
  const [name, setName] = useState<{ channelId: string; name: string | null }>()
  const [joining, setJoining] = useState(false)

  // My sidebar doesn't list the channel, so its name comes from GET /channels/{id}.
  useEffect(() => {
    let cancelled = false
    getChannelRequest(channelId)
      .then((channel) => {
        if (!cancelled) setName({ channelId, name: channel.name })
      })
      .catch(() => {
        // The bar still works without the name.
      })
    return () => {
      cancelled = true
    }
  }, [channelId])

  const channelName = name?.channelId === channelId ? name.name : null

  const join = async () => {
    setJoining(true)
    try {
      await joinChannelRequest(channelId)
      reload()
    } catch (error) {
      toast.error(describeChannelError(error))
      setJoining(false)
    }
  }

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-subtle px-4 py-3">
        <span className="min-w-0 text-sm text-muted-foreground">
          You're viewing{" "}
          <strong className="font-semibold text-foreground">
            {channelName ? `#${channelName}` : "this channel"}
          </strong>
          . Join it to send messages.
        </span>
        <Button disabled={joining} onClick={() => void join()}>
          {joining ? "Joining…" : "Join channel"}
        </Button>
      </div>
    </div>
  )
}
