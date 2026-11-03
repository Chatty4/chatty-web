import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { Button } from "./button"

type SettingsTabsProps<T extends string> = {
  tabs: readonly T[]
  labels: Record<T, string>
  value: T
  onChange: (tab: T) => void
  /** Smaller tabs for narrow side panels. */
  compact?: boolean
  className?: string
}

export function SettingsTabs<T extends string>({
  tabs,
  labels,
  value,
  onChange,
  compact = false,
  className,
}: SettingsTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label="Settings sections"
      className={cn(
        "flex shrink-0 gap-[3px] overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--color-border)]",
        className,
      )}
    >
      {tabs.map((tab) => (
        <Button
          key={tab}
          variant="ghost"
          role="tab"
          aria-selected={value === tab}
          onClick={() => onChange(tab)}
          className={cn(
            "rounded-b-none border-b-2 border-b-transparent",
            "aria-selected:border-b-primary aria-selected:text-primary aria-selected:hover:text-primary",
            compact && "px-[7px] text-xs",
          )}
        >
          {labels[tab]}
        </Button>
      ))}
    </div>
  )
}

export function SettingsPanel({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn("rounded-md border bg-surface p-[18px] sm:p-[22px]", className)}>
      {children}
    </section>
  )
}

export function SectionTitle({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-3.5 flex flex-col">
      <strong className="font-semibold">{title}</strong>
      {description && <span className="text-muted-foreground">{description}</span>}
    </div>
  )
}

export function DataList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col">{children}</div>
}

export function DataRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[58px] flex-wrap items-center gap-2.5 border-t py-2 first:border-t-0 sm:flex-nowrap sm:py-0">
      {children}
    </div>
  )
}

export function RowMain({ title, detail }: { title: ReactNode; detail?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <strong className="truncate font-semibold">{title}</strong>
      {detail && <span className="truncate text-xs text-muted-foreground">{detail}</span>}
    </div>
  )
}
