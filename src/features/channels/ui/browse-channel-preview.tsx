import { useState } from "react"
import { Hash, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirm } from "@/hooks/use-confirm"
import { toast } from "@/lib/toast"

import { memberCountLabel, type BrowseEntry } from "../utils/browse-entries"
import { describeChannelError } from "../utils/errors"

type BrowseChannelPreviewProps = {
  entry: BrowseEntry
  onJoin: (entry: BrowseEntry) => Promise<void>
  onLeave: (entry: BrowseEntry) => Promise<void>
  onOpen: (entry: BrowseEntry) => void
}

function describeAccess(entry: BrowseEntry): string {
  const kind = entry.kind === "private" ? "Private" : "Public"
  const parts = entry.memberCount === null ? [kind] : [memberCountLabel(entry.memberCount), kind]
  if (entry.archived) parts.push("Archived")
  return parts.join(" · ")
}

/** Details of the selected channel, with the actions that apply to it. */
export function BrowseChannelPreview({ entry, onJoin, onLeave, onOpen }: BrowseChannelPreviewProps) {
  const [busy, setBusy] = useState(false)
  const { confirm, confirmProps } = useConfirm()
  const Icon = entry.kind === "private" ? Lock : Hash

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      toast.error(describeChannelError(error))
    } finally {
      setBusy(false)
    }
  }

  const leave = async () => {
    const ok = await confirm({
      title: `Leave #${entry.name}?`,
      description: "You can rejoin later if the channel is public.",
      action: "Leave channel",
      destructive: true,
    })
    if (ok) await run(() => onLeave(entry))
  }

  return (
    <>
      <ConfirmDialog {...confirmProps} />
      <div className="grid size-[46px] place-items-center rounded-md border bg-surface-subtle text-muted-foreground">
        <Icon className="size-[22px]" aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <strong className="truncate text-xl font-semibold tracking-[-0.02em]">{entry.name}</strong>
        <span className="text-muted-foreground">{entry.topic || "No topic has been set."}</span>
      </div>
      <span className="text-[11px] text-faint-foreground">{describeAccess(entry)}</span>
      <div className="mt-auto flex w-full items-center justify-end gap-2">
        {entry.joined ? (
          <>
            {!entry.isDefault && (
              <Button variant="ghost" disabled={busy} onClick={() => void leave()}>
                Leave
              </Button>
            )}
            <Button onClick={() => onOpen(entry)}>Open channel</Button>
          </>
        ) : (
          <Button disabled={busy || entry.archived} onClick={() => void run(() => onJoin(entry))}>
            {busy ? "Joining…" : "Join channel"}
          </Button>
        )}
      </div>
    </>
  )
}
