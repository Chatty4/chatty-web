import { Forward } from "lucide-react"

/** Above the body of a forwarded message. Never says from where (D-20). */
export function ForwardedMark() {
  return (
    <span className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground italic">
      <Forward className="size-3" aria-hidden="true" />
      Forwarded
    </span>
  )
}
