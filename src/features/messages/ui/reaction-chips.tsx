import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { Reaction } from "../types"

type ReactionChipsProps = {
  reactions: Reaction[]
  /** Emoji with a request in flight. */
  busy: ReadonlySet<string>
  /** False in an archived channel: the chips still show, but can't be clicked. */
  canReact: boolean
  align?: "start" | "end"
  onToggle: (reaction: Reaction) => void
}

function describeReaction({ emoji, count, me }: Reaction): string {
  const people = `${count} ${count === 1 ? "reaction" : "reactions"}`
  return `${emoji} ${people}${me ? ", including yours" : ""}`
}

/** One chip per emoji under a message; mine are highlighted and click to remove. */
export function ReactionChips({
  reactions,
  busy,
  canReact,
  align = "start",
  onToggle,
}: ReactionChipsProps) {
  if (reactions.length === 0) return null

  return (
    <div
      aria-label="Message reactions"
      className={cn("mt-[5px] flex flex-wrap gap-[5px]", align === "end" && "justify-end")}
    >
      {reactions.map((reaction) => (
        <Button
          key={reaction.emoji}
          variant="secondary"
          size="sm"
          aria-pressed={reaction.me}
          aria-label={describeReaction(reaction)}
          title={describeReaction(reaction)}
          disabled={!canReact || busy.has(reaction.emoji)}
          className={cn(
            "min-w-[42px] rounded-full disabled:opacity-100",
            reaction.me &&
              "border-primary bg-accent text-primary hover:not-disabled:bg-accent",
          )}
          onClick={() => onToggle(reaction)}
        >
          <span>{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </Button>
      ))}
    </div>
  )
}
