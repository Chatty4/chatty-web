import type { Ref } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

type HistoryTopProps = {
  hasMore: boolean
  loadingMore: boolean
  failed: boolean
  /** Shown once the first message is loaded. */
  endLabel: string
  onLoadMore: () => void
  /** The element the list watches to load older messages. */
  sentinelRef: Ref<HTMLDivElement>
}

/** The top of the history: older-page states, or the end cap at the very start. */
export function HistoryTop({
  hasMore,
  loadingMore,
  failed,
  endLabel,
  onLoadMore,
  sentinelRef,
}: HistoryTopProps) {
  if (!hasMore) {
    return (
      <div className="pt-[18px] text-center">
        <span className="text-[11px] text-faint-foreground">{endLabel}</span>
      </div>
    )
  }

  // One fixed height for every state, so swapping them never moves the messages.
  return (
    <div ref={sentinelRef} className="flex h-12 items-center justify-center gap-2">
      {loadingMore ? (
        <span role="status" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Loading earlier messages…
        </span>
      ) : failed ? (
        <>
          <span role="alert" className="text-xs text-destructive">
            Couldn't load earlier messages.
          </span>
          <Button variant="secondary" size="sm" onClick={onLoadMore}>
            Try again
          </Button>
        </>
      ) : (
        <Button variant="secondary" size="sm" onClick={onLoadMore}>
          Load earlier messages
        </Button>
      )}
    </div>
  )
}
