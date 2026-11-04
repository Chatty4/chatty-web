import { useMemo } from "react"
import { Pin as PinIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SidePanel } from "@/components/ui/side-panel"
import { toast } from "@/lib/toast"

import { useMessages } from "../context"
import { useMemberNames } from "../hooks/use-member-names"
import { usePinToggle } from "../hooks/use-pin-toggle"
import { usePins } from "../hooks/use-pins"
import { jumpToMessage } from "../utils/jump-to-message"
import { extractMentionIds } from "../utils/mentions"
import { PinCard } from "./pin-card"

export type PinsPanelProps = {
  channelId: string
  teamId: string
  /** "#general", or the other person's name in a DM. */
  label: string
  /** False in an archived channel. */
  canUnpin: boolean
  onClose: () => void
  onChannelArchived: () => void
}

function PinsSkeleton() {
  return (
    <div role="status" aria-label="Loading pinned messages" className="flex flex-col gap-[9px]">
      {[0, 1, 2].map((key) => (
        <div key={key} className="flex animate-pulse flex-col gap-[9px] rounded-md border p-3">
          <div className="h-[11px] w-1/2 rounded-sm bg-surface-hover" />
          <div className="h-[11px] w-11/12 rounded-sm bg-surface-hover" />
          <div className="h-[11px] w-2/3 rounded-sm bg-surface-hover" />
        </div>
      ))}
    </div>
  )
}

/** The channel's pinned messages, newest pin first. */
export function PinsPanel({
  channelId,
  teamId,
  label,
  canUnpin,
  onClose,
  onChannelArchived,
}: PinsPanelProps) {
  const { loadPins, setPinned } = useMessages()
  const pins = usePins(channelId)
  const items = useMemo(() => pins?.items ?? [], [pins])

  const userIds = useMemo(
    () => [
      ...new Set(
        items.flatMap((pin) => [
          pin.message.author_id,
          pin.pinned_by,
          ...extractMentionIds(pin.message.body),
        ]),
      ),
    ],
    [items],
  )
  const names = useMemberNames(teamId, userIds)

  const { busyId, toggle } = usePinToggle({
    setPinned: (messageId, on) => setPinned(channelId, messageId, on),
    onChannelArchived,
  })

  const jump = (messageId: string) => {
    if (!jumpToMessage(messageId)) {
      toast.error("Scroll up to load this message")
      return
    }
    // On small screens the panel covers the list, so get out of the way.
    if (window.matchMedia("(max-width: 767px)").matches) onClose()
  }

  const loadingFirstTime = !pins || (pins.status === "loading" && items.length === 0)

  return (
    <SidePanel
      title="Pinned messages"
      subtitle={label}
      closeLabel="Close pinned messages"
      onClose={onClose}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-[18px]">
        {loadingFirstTime && <PinsSkeleton />}

        {pins?.status === "error" && (
          <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 text-center">
            <strong className="font-semibold">Couldn't load pinned messages.</strong>
            <span role="alert" className="text-muted-foreground">
              {pins.error}
            </span>
            <Button variant="secondary" size="sm" onClick={() => void loadPins(channelId)}>
              Try again
            </Button>
          </div>
        )}

        {pins?.status === "loaded" && items.length === 0 && (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-[7px] text-center text-muted-foreground">
            <div className="mb-[5px] grid size-[46px] place-items-center rounded-md border bg-surface-subtle">
              <PinIcon className="size-[22px]" aria-hidden="true" />
            </div>
            <strong className="font-semibold text-foreground">No pinned messages</strong>
            <span>Pin important messages so they're easy to find.</span>
          </div>
        )}

        {items.length > 0 && (
          <div className="flex flex-col gap-[9px]">
            {items.map((pin) => (
              <PinCard
                key={pin.message.id}
                pin={pin}
                names={names}
                canUnpin={canUnpin}
                unpinning={busyId === pin.message.id}
                onJump={() => jump(pin.message.id)}
                onUnpin={() => void toggle(pin.message.id, false)}
              />
            ))}
          </div>
        )}
      </div>
    </SidePanel>
  )
}
