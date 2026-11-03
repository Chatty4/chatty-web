import { Menu, Settings, UserCircle } from "lucide-react"
import { Link, useLocation, useParams } from "react-router"

import { Button, buttonVariants } from "@/components/ui/button"

import { ThemeToggle } from "./theme-toggle"

type AppHeaderProps = {
  title: string
  subtitle?: string
  onOpenMenu: () => void
}

/** The bar above the main area. Shows a settings link when on a channel page. */
export function AppHeader({ title, subtitle, onOpenMenu }: AppHeaderProps) {
  const { teamId, channelId } = useParams()
  const { pathname } = useLocation()
  const isOnChannelSettings = pathname.endsWith("/settings")
  const channelSettingsPath =
    teamId && channelId && !isOnChannelSettings
      ? `/teams/${teamId}/channels/${channelId}/settings`
      : null

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
        {channelSettingsPath && (
          <Link
            to={channelSettingsPath}
            aria-label="Channel settings"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <Settings className="size-[18px]" />
          </Link>
        )}
        <Link
          to="/profile"
          aria-label="Account settings"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <UserCircle className="size-[18px]" />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  )
}
