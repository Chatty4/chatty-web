import { Hash, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { memberCountLabel, type BrowseEntry } from "../utils/browse-entries"

function channelMeta(entry: BrowseEntry): string {
  if (entry.memberCount !== null) return memberCountLabel(entry.memberCount)
  return entry.kind === "private" ? "Private" : "Public"
}

export function BrowseChannelRow({
  entry,
  active,
  onSelect,
}: {
  entry: BrowseEntry
  active: boolean
  onSelect: () => void
}) {
  const Icon = entry.kind === "private" ? Lock : Hash

  return (
    <Button
      variant="ghost"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "h-auto min-h-[58px] w-full justify-start gap-2.5 px-2.5 py-2 text-left",
        active &&
          "bg-accent text-primary hover:not-disabled:bg-accent hover:not-disabled:text-primary",
      )}
    >
      <Icon className="size-[17px]" aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col">
        <strong className="truncate font-semibold">{entry.name}</strong>
        <small className="truncate text-[11px] font-normal text-muted-foreground">
          {channelMeta(entry)}
          {entry.archived && " · Archived"}
        </small>
      </span>
      {entry.joined && (
        <small className="text-[11px] font-normal text-muted-foreground">Joined</small>
      )}
    </Button>
  )
}
