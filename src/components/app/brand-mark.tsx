import { MessageCircle } from "lucide-react"

import { cn } from "@/lib/utils"

/** The Chatty logo: a chat bubble on the soft accent. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-md bg-accent text-primary",
        className,
      )}
    >
      <MessageCircle className="size-5" strokeWidth={2.2} />
    </span>
  )
}
