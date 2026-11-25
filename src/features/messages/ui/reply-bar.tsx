import { Reply, X } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { ReplyPreview } from "../types"
import { quoteText } from "../utils/reply"

type ReplyBarProps = {
  quote: ReplyPreview
  names: Record<string, string>
  onCancel: () => void
}

/** Above the message box while writing a reply: who and what it replies to, and ✕ to cancel. */
export function ReplyBar({ quote, names, onCancel }: ReplyBarProps) {
  const authorName = names[quote.author_id] ?? "Unknown member"

  return (
    <div className="flex items-center gap-2 border-b bg-surface-subtle py-1 pr-1 pl-3 text-xs">
      <Reply aria-hidden="true" className="size-[15px] shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate text-muted-foreground">
        Replying to <strong className="font-semibold text-foreground">{authorName}</strong>
        {": "}
        {quoteText(quote, names)}
      </span>
      <Button variant="ghost" size="icon-sm" aria-label="Cancel reply" onClick={onCancel}>
        <X />
      </Button>
    </div>
  )
}
