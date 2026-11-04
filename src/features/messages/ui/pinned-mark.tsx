import { Pin } from "lucide-react"

/** Small label on a pinned message. */
export function PinnedMark() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
      <Pin className="size-3" aria-hidden="true" />
      Pinned
    </span>
  )
}
