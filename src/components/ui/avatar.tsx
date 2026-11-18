import { cn } from "@/lib/utils"

/** "Ana Maria Pop" -> "AM": shown when there is no avatar image. */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => [...part][0])
  return letters.slice(0, 2).join("").toUpperCase() || "?"
}

export function Avatar({
  name,
  src,
  className,
  online = false,
}: {
  name: string
  /** The avatar image. Without it, the initials. */
  src?: string
  className?: string
  /** Shows the green presence dot. The caller says "online" in text for screen readers. */
  online?: boolean
}) {
  const avatar = (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-[11px] font-semibold text-primary",
        className,
      )}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name)}
    </span>
  )
  if (!online) return avatar
  return (
    <span className="relative inline-flex shrink-0">
      {avatar}
      <span
        aria-hidden="true"
        className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-surface bg-online"
      />
    </span>
  )
}
