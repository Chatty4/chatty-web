import { cn } from "@/lib/utils"

import { formatCount } from "../store/unread"
import type { UnreadCounts } from "../types"

/** A sidebar row's count: mentions stand out, plain unread messages stay quiet. */
export function UnreadBadge({ unread, mentions }: UnreadCounts) {
  if (unread === 0) return null
  const isMention = mentions > 0
  const count = isMention ? mentions : unread
  const label = isMention
    ? `${formatCount(count)} ${count === 1 ? "mention" : "mentions"}`
    : `${formatCount(count)} unread`
  return (
    <span
      className={cn(
        "ml-auto grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full px-1.5 text-[10px] font-semibold leading-none",
        isMention ? "bg-primary text-primary-foreground" : "bg-surface-hover text-muted-foreground",
      )}
    >
      <span aria-hidden="true">{formatCount(count)}</span>
      <span className="sr-only">{label}</span>
    </span>
  )
}
