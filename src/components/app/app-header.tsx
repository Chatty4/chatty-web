import { Hash, Lock, Menu, Pin, Search, Settings } from "lucide-react"
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth"
import { dmDisplayName, useChannels } from "@/features/channels"
import { usePins } from "@/features/messages"
import { cn } from "@/lib/utils"

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
  const { channels, dms, memberNames } = useChannels()
  const { user } = useAuth()

  const [searchParams, setSearchParams] = useSearchParams()
  const detailsOpen = searchParams.has("details")
  const pinsOpen = searchParams.has("pins")
  const inChannel = !!teamId && !!channelId && !pathname.endsWith("/settings")
  const pinCount = usePins(inChannel ? channelId : undefined)?.items.length ?? 0

  // Only one right-hand panel at a time: opening one closes the other.
  const togglePanel = (panel: "details" | "pins") =>
    setSearchParams(
      (prev) => {
        const wasOpen = prev.has(panel)
        prev.delete("details")
        prev.delete("pins")
        if (!wasOpen) prev.set(panel, "")
        return prev
      },
      { replace: true },
    )

  const channel = channelId ? [...channels, ...dms].find((c) => c.id === channelId) : null
  const isDm = channel?.kind === "dm"
  const displayTitle = isDm
    ? dmDisplayName(channel.dm_member_ids ?? [], user?.id ?? "", memberNames)
    : (channel?.name ?? title)
  const displaySubtitle = channel?.topic ?? subtitle
  const TitleIcon = channel && !isDm ? (channel.kind === "private" ? Lock : Hash) : null

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
        {inChannel && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={pinCount > 0 ? `Pinned messages, ${pinCount}` : "Pinned messages"}
            aria-pressed={pinsOpen}
            className={cn("relative", pinsOpen && "bg-surface-hover text-foreground")}
            onClick={() => togglePanel("pins")}
          >
            <Pin className="size-[18px]" />
            {pinCount > 0 && (
              <span className="absolute -top-[3px] -right-[3px] grid h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-surface bg-primary px-1 text-[9px] leading-none text-primary-foreground">
                {pinCount}
              </span>
            )}
          </Button>
        )}
        {inChannel && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Channel details"
            aria-pressed={detailsOpen}
            className={detailsOpen ? "bg-surface-hover text-foreground" : undefined}
            onClick={() => togglePanel("details")}
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
