import { cn } from "@/lib/utils"

/** "Ana Maria Pop" -> "AM". Avatar images come with file uploads. */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => [...part][0])
  return letters.slice(0, 2).join("").toUpperCase() || "?"
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-primary",
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
