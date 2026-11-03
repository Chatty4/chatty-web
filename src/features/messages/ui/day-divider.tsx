/** A thin rule with a day label in the middle, between messages from different days. */
export function DayDivider({ label }: { label: string }) {
  return (
    <div
      role="separator"
      aria-label={label}
      className="flex h-7 items-center gap-2.5 text-[11px] font-medium text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border"
    >
      <span className="px-1">{label}</span>
    </div>
  )
}
