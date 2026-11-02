import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"

import { ThemeToggle } from "./theme-toggle"

type AppHeaderProps = {
  title: string
  subtitle?: string
  onOpenMenu: () => void
}

/** The bar above the main area. Channels add their name, topic and members here (CHAT-194). */
export function AppHeader({ title, subtitle, onOpenMenu }: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-2.5 md:h-16 md:px-[18px]">
      <div className="flex min-w-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open sidebar"
          onClick={onOpenMenu}
        >
          <Menu className="size-[19px]" />
        </Button>
        <div className="flex min-w-0 flex-col">
          <strong className="truncate text-[15px] leading-tight font-semibold">{title}</strong>
          {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  )
}
