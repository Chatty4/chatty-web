import type { ReactNode } from "react"
import { X } from "lucide-react"

import { Button } from "./button"

type SidePanelProps = {
  title: string
  subtitle?: string | null
  closeLabel: string
  onClose: () => void
  children: ReactNode
}

/** The right-hand panel beside the message list; an overlay on small screens. */
export function SidePanel({ title, subtitle, closeLabel, onClose, children }: SidePanelProps) {
  return (
    <aside
      aria-label={title}
      className="flex w-[360px] shrink-0 flex-col border-l bg-surface max-md:fixed max-md:top-16 max-md:right-0 max-md:bottom-0 max-md:z-30 max-md:w-[min(380px,92vw)] max-md:shadow-2xl"
    >
      <div className="flex min-h-[66px] shrink-0 items-center justify-between border-b py-2.5 pr-3 pl-[18px]">
        <div className="flex min-w-0 flex-col">
          <strong className="font-semibold">{title}</strong>
          {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
        </div>
        <Button variant="ghost" size="icon" aria-label={closeLabel} onClick={onClose}>
          <X className="size-[17px]" />
        </Button>
      </div>
      {children}
    </aside>
  )
}
