import { cn } from "@/lib/utils"

import type { ReplyPreview } from "../types"
import { quoteText } from "../utils/reply"

type ReplyQuoteProps = {
  quote: ReplyPreview
  names: Record<string, string>
  /** Shows the quoted message. Without it, or when it was deleted, the quote isn't clickable. */
  onOpen?: () => void
}

/** Above a reply's text: who wrote the message it replies to, and the start of it. */
export function ReplyQuote({ quote, names, onOpen }: ReplyQuoteProps) {
  const authorName = names[quote.author_id] ?? "Unknown member"
  const text = quoteText(quote, names)
  const className = cn(
    "mb-1 block w-full max-w-full rounded-r-sm border-l-2 border-primary/60 bg-surface/60 py-0.5 pr-2 pl-2 text-left text-xs",
    onOpen && !quote.deleted && "cursor-pointer transition-colors hover:bg-surface",
  )
  const content = (
    <>
      <strong className="block truncate font-semibold text-foreground">{authorName}</strong>
      <span
        className={cn(
          "line-clamp-2 [overflow-wrap:anywhere] text-muted-foreground",
          quote.deleted && "italic",
        )}
      >
        {text}
      </span>
    </>
  )

  if (!onOpen || quote.deleted) return <div className={className}>{content}</div>
  return (
    <button
      type="button"
      className={cn(className, "outline-none focus-visible:ring-2 focus-visible:ring-ring")}
      aria-label={`Replying to ${authorName}: ${text}. Show the message`}
      onClick={onOpen}
    >
      {content}
    </button>
  )
}
