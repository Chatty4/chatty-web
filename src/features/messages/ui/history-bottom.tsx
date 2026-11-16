import type { Ref } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

type HistoryBottomProps = {
  loadingNewer: boolean
  failed: boolean
  onLoadNewer: () => void
  /** The element the list watches to load newer messages. */
  sentinelRef: Ref<HTMLDivElement>
}

/** Below a jumped-to window: newer-page states, until the newest messages are loaded. */
export function HistoryBottom({ loadingNewer, failed, onLoadNewer, sentinelRef }: HistoryBottomProps) {
  // One fixed height for every state, so swapping them never moves the messages.
  return (
    <div ref={sentinelRef} className="flex h-12 items-center justify-center gap-2">
      {loadingNewer ? (
        <span role="status" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Loading newer messages…
        </span>
      ) : failed ? (
        <>
          <span role="alert" className="text-xs text-destructive">
            Couldn't load newer messages.
          </span>
          <Button variant="secondary" size="sm" onClick={onLoadNewer}>
            Try again
          </Button>
        </>
      ) : (
        <Button variant="secondary" size="sm" onClick={onLoadNewer}>
          Load newer messages
        </Button>
      )}
    </div>
  )
}
