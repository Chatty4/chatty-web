import { Hash, Lock, Menu, Search, Settings } from "lucide-react"
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router"

import { Button } from "@/components/ui/button"
import { useChannels } from "@/features/channels"

import { ThemeToggle } from "./theme-toggle"

type AppHeaderProps = {
  title: string
  subtitle?: string
  onOpenMenu: () => void
}

/** The bar above the main area: title, topic, member count, search, settings, theme. */
export function AppHeader({ title, subtitle, onOpenMenu }: AppHeaderProps) {
  const { teamId, channelId } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { channels } = useChannels()

  const [searchParams, setSearchParams] = useSearchParams()
  const detailsOpen = searchParams.has("details")
  const canToggleDetails = !!teamId && !!channelId && !pathname.endsWith("/settings")
  const toggleDetails = () =>
    setSearchParams(
      (prev) => {
        if (prev.has("details")) prev.delete("details")
        else prev.set("details", "")
        return prev
      },
      { replace: true },
    )

  const channel = channelId ? channels.find((c) => c.id === channelId) : null
  const displayTitle = channel?.name ?? title
  const displaySubtitle = channel?.topic ?? subtitle
  const TitleIcon = channel
    ? channel.kind === "private"
      ? Lock
      : Hash
    : null

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-[18px]">
      <div className="flex min-w-0 items-center gap-2">
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
          <div className="flex items-center gap-[5px] leading-[1.3]">
            {TitleIcon && <TitleIcon className="size-[18px] shrink-0 text-foreground" />}
            <strong className="truncate text-[15px] font-semibold">{displayTitle}</strong>
          </div>
          {displaySubtitle && (
            <span className="truncate text-xs text-muted-foreground">{displaySubtitle}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        {canToggleDetails && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Channel details"
            aria-pressed={detailsOpen}
            className={detailsOpen ? "bg-surface-hover text-foreground" : undefined}
            onClick={toggleDetails}
          >
            <Settings className="size-[18px]" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search"
          onClick={() => teamId && navigate(`/teams/${teamId}/channels/browse`)}
        >
          <Search className="size-[18px]" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
