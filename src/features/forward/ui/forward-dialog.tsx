import { useEffect, useMemo, useState } from "react"
import { Check, Hash, Loader2, Lock, MessageSquare, RotateCcw, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth"
import { useChannels } from "@/features/channels"
import { MAX_MESSAGE_LENGTH } from "@/features/messages/constants"
import { useCountdown } from "@/hooks/use-countdown"
import { waitText } from "@/lib/retry-after"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

import { MAX_FORWARD_DESTINATIONS } from "../constants"
import { useForward } from "../hooks/use-forward"
import { allSent } from "../store/forward-sends"
import type { Destination, DestinationSend } from "../types"
import { filterDestinations, forwardDestinations, toggleDestination } from "../utils/destinations"

type ForwardDialogProps = {
  messageId: string
  onClose: () => void
}

/**
 * Forward a message to up to 5 channels or DMs of the team, with an optional comment (D-20).
 * Closes by itself once every destination got it; a failed one keeps the dialog open with Retry.
 */
export function ForwardDialog({ messageId, onClose }: ForwardDialogProps) {
  const { user } = useAuth()
  const { channels, dms, memberNames } = useChannels()
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [comment, setComment] = useState("")
  const { sends, start, retry } = useForward(messageId)

  const destinations = useMemo(
    () => forwardDestinations(channels, dms, user?.id ?? "", memberNames),
    [channels, dms, user?.id, memberNames],
  )
  const shown = filterDestinations(destinations, query)
  const full = selected.length >= MAX_FORWARD_DESTINATIONS

  const done = sends !== null && allSent(sends)
  useEffect(() => {
    if (!done) return
    toast.success("Forwarded")
    onClose()
  }, [done, onClose])

  if (sends) {
    const byId = new Map(destinations.map((destination) => [destination.id, destination]))
    return (
      <Dialog open title="Forward message" onClose={onClose}>
        <ul className="flex flex-col gap-1" aria-label="Destinations">
          {Object.values(sends).map((send) => (
            <SendRow
              key={send.channelId}
              destination={byId.get(send.channelId)}
              send={send}
              onRetry={() => retry(send.channelId)}
            />
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog
      open
      title="Forward message"
      description={`Pick up to ${MAX_FORWARD_DESTINATIONS} channels or direct messages.`}
      onClose={onClose}
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search channels and people"
          aria-label="Search channels and people"
          className="pl-8"
          autoFocus
        />
      </div>

      <ul className="mt-2 flex max-h-64 flex-col gap-0.5 overflow-y-auto" aria-label="Destinations">
        {shown.length === 0 && (
          <li className="px-2 py-1.5 text-sm text-muted-foreground">Nothing found.</li>
        )}
        {shown.map((destination) => {
          const checked = selected.includes(destination.id)
          return (
            <li key={destination.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                disabled={!checked && full}
                onClick={() => setSelected((current) => toggleDestination(current, destination.id))}
                className={cn(
                  "flex h-[34px] w-full items-center gap-2 rounded-sm px-[9px] text-left text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45",
                  checked
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                )}
              >
                <DestinationIcon kind={destination.kind} />
                <span className="min-w-0 flex-1 truncate">{destination.name}</span>
                {checked && <Check className="size-[15px] shrink-0" aria-hidden="true" />}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
        {selected.length} of {MAX_FORWARD_DESTINATIONS} selected
      </p>

      <Textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={MAX_MESSAGE_LENGTH}
        placeholder="Add a comment (optional)"
        aria-label="Comment"
        className="mt-3"
      />

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={selected.length === 0} onClick={() => void start(selected, comment)}>
          Forward
        </Button>
      </div>
    </Dialog>
  )
}

function DestinationIcon({ kind }: { kind: Destination["kind"] }) {
  const Icon = kind === "dm" ? MessageSquare : kind === "private" ? Lock : Hash
  return <Icon className="size-[15px] shrink-0" aria-hidden="true" />
}

/** One destination after Forward: a spinner, then sent, or why not with Retry. */
function SendRow({
  destination,
  send,
  onRetry,
}: {
  /** Undefined when it left the sidebar meanwhile. */
  destination: Destination | undefined
  send: DestinationSend
  onRetry: () => void
}) {
  return (
    <li className="flex min-h-[34px] items-center gap-2 px-[9px] text-[13px]">
      <DestinationIcon kind={destination?.kind ?? "public"} />
      <span className="min-w-0 flex-1 truncate">{destination?.name ?? "Unknown channel"}</span>
      {send.status === "sending" && (
        <span role="status" className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Sending…
        </span>
      )}
      {send.status === "sent" && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Check className="size-3.5" aria-hidden="true" />
          Sent
        </span>
      )}
      {send.status === "failed" && (
        <FailedNote key={send.failure?.retryAt} send={send} onRetry={onRetry} />
      )}
    </li>
  )
}

/** Like a message that wasn't sent: why, and Retry once the wait of a 429 is over. */
function FailedNote({ send, onRetry }: { send: DestinationSend; onRetry: () => void }) {
  const waitLeft = useCountdown(send.failure?.retryAt)
  return (
    <span className="text-right text-xs text-destructive">
      {send.failure?.message ?? "Not sent"}
      {waitLeft > 0 && <span aria-live="polite"> Try again in {waitText(waitLeft)}.</span>}
      {(send.failure?.retryable ?? true) && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-1 h-auto px-1 py-0 text-xs"
          disabled={waitLeft > 0}
          onClick={onRetry}
        >
          <RotateCcw className="size-3" />
          Retry
        </Button>
      )}
    </span>
  )
}
