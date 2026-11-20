import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useCountdown } from "@/hooks/use-countdown"
import { waitText } from "@/lib/retry-after"

import type { SendFailure } from "../types"

type SendFailureNoteProps = {
  /** Why it wasn't sent; without one, a plain "Not sent" that can be retried. */
  failure?: SendFailure
  onRetry: () => void
  onDismiss: () => void
}

/**
 * Below a message that wasn't sent: why, Retry and Dismiss. After a 429 the wait counts down,
 * and Retry waits for it, since sending sooner is refused again.
 * Mount it with `key={failure?.retryAt}` so a new failure starts a new countdown.
 */
export function SendFailureNote({ failure, onRetry, onDismiss }: SendFailureNoteProps) {
  const waitLeft = useCountdown(failure?.retryAt)

  return (
    <span className="text-xs text-destructive">
      {failure?.message ?? "Not sent"}
      {waitLeft > 0 && (
        <span aria-live="polite"> Try again in {waitText(waitLeft)}.</span>
      )}{" "}
      {(failure?.retryable ?? true) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-1 py-0 text-xs"
          disabled={waitLeft > 0}
          onClick={onRetry}
        >
          <RotateCcw className="size-3" />
          Retry
        </Button>
      )}
      <Button variant="ghost" size="sm" className="h-auto px-1 py-0 text-xs" onClick={onDismiss}>
        Dismiss
      </Button>
    </span>
  )
}
