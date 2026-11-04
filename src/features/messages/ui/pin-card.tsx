import type { KeyboardEvent } from "react"
import { PinOff } from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

import type { Pin } from "../types"
import { formatTimeAgo } from "../utils/dates"
import { MessageMarkdown } from "./message-markdown"

const dateFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

type PinCardProps = {
  pin: Pin
  names: Record<string, string>
  canUnpin: boolean
  unpinning: boolean
  onJump: () => void
  onUnpin: () => void
}

/** One pinned message: who wrote it, the text, and who pinned it. Click to jump to it. */
export function PinCard({ pin, names, canUnpin, unpinning, onJump, onUnpin }: PinCardProps) {
  const { message } = pin
  const authorName = names[message.author_id] ?? "Unknown member"

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onJump()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="group/pin cursor-pointer rounded-md border bg-surface p-3 transition-colors outline-none hover:border-border-strong hover:bg-surface-subtle focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-accent"
      onClick={onJump}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center gap-[7px]">
        <Avatar name={authorName} className="size-[22px] text-[9px]" />
        <strong className="min-w-0 truncate text-xs font-semibold">{authorName}</strong>
        <time
          className="ml-auto text-[10px] whitespace-nowrap text-faint-foreground"
          dateTime={message.created_at}
        >
          {dateFormat.format(new Date(message.created_at))}
        </time>
      </div>

      {/* inert: a link in the text shouldn't compete with clicking the card */}
      <div
        inert
        className="my-[9px] line-clamp-3 text-sm [overflow-wrap:anywhere] [&>*+*]:mt-1"
      >
        <MessageMarkdown body={message.body} own={false} names={names} />
      </div>

      <div className="flex min-h-7 items-center gap-1 text-[11px] text-muted-foreground">
        <span className="min-w-0 flex-1 truncate">
          Pinned by {names[pin.pinned_by] ?? "Unknown member"} · {formatTimeAgo(pin.pinned_at)}
        </span>
        {canUnpin && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Unpin message"
            disabled={unpinning}
            className="opacity-0 group-focus-within/pin:opacity-100 group-hover/pin:opacity-100 max-md:opacity-100"
            onClick={(event) => {
              event.stopPropagation()
              onUnpin()
            }}
          >
            <PinOff />
          </Button>
        )}
      </div>
    </div>
  )
}
