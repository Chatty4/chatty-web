import { Menu } from "@base-ui/react/menu"
import { BellOff, ChevronDown, Hash, Headphones, Lock, MessageSquare, Plus, Search, Settings, X } from "lucide-react"
import { Link, useMatches, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { initials } from "@/components/ui/avatar"
import { dmDisplayName, useChannels } from "@/features/channels"
import { useAuth } from "@/features/auth"
import { usePresence } from "@/features/presence"
import { useActiveTeamId, useTeams } from "@/features/teams"
import { UnreadBadge, useUnread } from "@/features/unread"
import { cn } from "@/lib/utils"

import { UserMenu } from "./user-menu"

const menuItemClass =
  "flex h-9 cursor-pointer items-center gap-2 rounded-sm px-2.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-primary [&_svg]:size-[15px]"

function useActiveChannelId(): string | null {
  const matches = useMatches()
  for (let i = matches.length - 1; i >= 0; i--) {
    const id = (matches[i].params as { channelId?: string }).channelId
    if (id) return id
  }
  return null
}

function MutedIcon({ muted }: { muted: boolean }) {
  if (!muted) return null
  return (
    <>
      <BellOff className="size-[13px] shrink-0" aria-hidden="true" />
      <span className="sr-only">, muted</span>
    </>
  )
}

type SidebarProps = {
  open: boolean
  onClose: () => void
}

/** The workspace column: team name header, search, channels, DMs, and user menu. */
export function Sidebar({ open, onClose }: SidebarProps) {
  const teamId = useActiveTeamId()
  const activeChannelId = useActiveChannelId()
  const { channels, dms, memberNames, failed, reload } = useChannels()
  const { user } = useAuth()
  const { teams, loading: teamsLoading, failed: teamsFailed } = useTeams()
  const { getCounts } = useUnread()
  const { isOnline } = usePresence()
  const navigate = useNavigate()
  const myUserId = user?.id ?? ""

  // The open channel is being read, so it shows no badge.
  const countsOf = (channelId: string, isActive: boolean) =>
    isActive ? { unread: 0, mentions: 0 } : getCounts(channelId)

  const activeTeam = teams.find((t) => t.id === teamId)

  const go = (path: string) => {
    navigate(path)
    onClose()
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-overlay md:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}
      <aside
        aria-label="Workspace"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r bg-background transition-transform md:static md:z-auto md:translate-x-0",
          open ? "translate-x-0 shadow-[0_12px_30px_var(--shadow)]" : "-translate-x-full",
        )}
      >
        {/* Header — team selector */}
        <div className="flex h-16 shrink-0 items-center px-3">
          <Menu.Root>
            <Menu.Trigger className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm px-2 py-[9px] text-sm font-semibold text-foreground outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:bg-surface-hover">
              {activeTeam && (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary text-[12px] font-semibold text-primary-foreground">
                  {activeTeam.name[0]?.toUpperCase()}
                </span>
              )}
              <span className="truncate">{activeTeam?.name ?? "No team"}</span>
              <ChevronDown className="ml-auto size-[15px] shrink-0 text-muted-foreground" aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="bottom" align="start" sideOffset={6} className="z-50 outline-none">
                <Menu.Popup className="w-[220px] rounded-md border bg-popover p-1 shadow-[0_8px_24px_var(--shadow)] outline-none">
                  {teams.map((team) => (
                    <Menu.Item
                      key={team.id}
                      className={cn(menuItemClass, team.id === teamId && "font-medium text-primary")}
                      onClick={() => go(`/teams/${team.id}`)}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-accent text-[11px] font-semibold text-accent-foreground">
                        {team.name[0]?.toUpperCase()}
                      </span>
                      <span className="truncate">{team.name}</span>
                    </Menu.Item>
                  ))}
                  <Menu.Separator className="my-1 h-px bg-border" />
                  <Menu.Item className={menuItemClass} onClick={() => go("/teams/new")}>
                    <Plus className="text-muted-foreground" />
                    Create team
                  </Menu.Item>
                  {teamId && (
                    <Menu.Item className={menuItemClass} onClick={() => go(`/teams/${teamId}/settings`)}>
                      <Settings className="text-muted-foreground" />
                      Team settings
                    </Menu.Item>
                  )}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
          <Button
            variant="ghost"
            size="icon"
            className="ml-1 md:hidden"
            aria-label="Close sidebar"
            onClick={onClose}
          >
            <X className="size-[18px]" />
          </Button>
        </div>

        {/* Everything below belongs to a team, so its links only exist with one. */}
        {!teamId ? (
          <div className="flex-1 px-5 pt-2">
            {!teamsLoading && !teamsFailed && (
              <p className="text-[13px] text-faint-foreground">
                Channels and direct messages show up here once you're in a team.
              </p>
            )}
          </div>
        ) : (
        <>
        {/* Search & browse bar */}
        <button
          type="button"
          onClick={() => go(`/teams/${teamId}/channels/browse`)}
          className="mx-3 mb-3 flex h-[34px] shrink-0 cursor-pointer items-center gap-2 rounded-sm border bg-surface px-[9px] text-[13px] text-muted-foreground outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Search className="size-[15px] shrink-0" />
          <span className="flex-1 text-left">Search &amp; browse</span>
        </button>

        {/* Nav */}
        <nav
          aria-label="Channels and direct messages"
          className="flex-1 overflow-y-auto px-2 pb-4"
        >
          {/* Channels section */}
          <div className="flex h-7 items-center px-2">
            <span className="flex-1 text-xs font-semibold text-muted-foreground">Channels</span>
            <Link
              to={`/teams/${teamId}/channels/new`}
              aria-label="Create channel"
              onClick={onClose}
              className="flex size-[26px] items-center justify-center rounded text-muted-foreground outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-[15px]" />
            </Link>
          </div>

          {channels.map((ch) => {
            const isActive = ch.id === activeChannelId
            const Icon = ch.kind === "private" ? Lock : Hash
            const counts = countsOf(ch.id, isActive)
            return (
              <Link
                key={ch.id}
                to={`/teams/${teamId}/channels/${ch.id}`}
                onClick={onClose}
                className={cn(
                  "flex h-[34px] w-full items-center gap-2 rounded-sm px-[9px] text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                  counts.unread > 0 && !ch.my.muted && "font-semibold text-foreground",
                  (ch.archived || ch.my.muted) && "opacity-50",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="size-[15px] shrink-0" />
                <span className="min-w-0 flex-1 truncate">{ch.name}</span>
                <MutedIcon muted={ch.my.muted} />
                {ch.archived && (
                  <span className="ml-auto shrink-0 text-[10px] text-faint-foreground">archived</span>
                )}
                <UnreadBadge {...counts} />
              </Link>
            )
          })}

          <Link
            to={`/teams/${teamId}/channels/browse`}
            onClick={onClose}
            className="mt-0.5 flex h-[34px] w-full items-center gap-2 rounded-sm px-[9px] text-[13px] text-faint-foreground outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="size-[15px] shrink-0" />
            <span>Browse channels</span>
          </Link>

          {/* DMs section */}
          <div className="mt-[22px] flex h-7 items-center px-2">
            <span className="flex-1 text-xs font-semibold text-muted-foreground">Direct messages</span>
            <Link
              to={`/teams/${teamId}/dms/new`}
              aria-label="New direct message"
              onClick={onClose}
              className="flex size-[26px] items-center justify-center rounded text-muted-foreground outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-[15px]" />
            </Link>
          </div>

          {dms.map((dm) => {
            const isActive = dm.id === activeChannelId
            const label = dmDisplayName(dm.dm_member_ids ?? [], myUserId, memberNames)
            const abbr = initials(label).slice(0, 2)
            const counts = countsOf(dm.id, isActive)
            // A group DM shows the dot while anyone else in it is online.
            const online = (dm.dm_member_ids ?? []).some((id) => id !== myUserId && isOnline(id))
            return (
              <Link
                key={dm.id}
                to={`/teams/${teamId}/channels/${dm.id}`}
                onClick={onClose}
                className={cn(
                  "flex h-[34px] w-full items-center gap-2 rounded-sm px-[9px] text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                  counts.unread > 0 && !dm.my.muted && "font-semibold text-foreground",
                  dm.my.muted && "opacity-50",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Mini avatar */}
                <span className="relative flex-none">
                  <span className="grid size-[22px] place-items-center rounded-full bg-surface-hover text-[9px] font-semibold text-muted-foreground">
                    {abbr}
                  </span>
                  {online && (
                    <span className="absolute -right-0.5 bottom-0 size-[7px] rounded-full border border-background bg-online" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {online && <span className="sr-only">, online</span>}
                <MutedIcon muted={dm.my.muted} />
                <UnreadBadge {...counts} />
              </Link>
            )
          })}

          {failed ? (
            <div className="flex flex-col items-start gap-1 px-2 pt-2">
              <p role="alert" className="text-[13px] text-destructive">
                Couldn't load channels.
              </p>
              <Button variant="secondary" size="sm" onClick={reload}>
                Try again
              </Button>
            </div>
          ) : (
            dms.length === 0 &&
            channels.length === 0 && (
              <p className="px-2 pt-2 text-[13px] text-faint-foreground">No channels yet.</p>
            )
          )}
        </nav>
        </>
        )}

        {/* Footer — user menu + action icons */}
        <div className="flex min-h-[66px] shrink-0 items-center gap-0.5 border-t px-2 py-2.5">
          <UserMenu />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Start huddle"
            className="shrink-0"
          >
            <Headphones className="size-[17px]" />
          </Button>
          {teamId && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="New message"
              className="shrink-0"
              onClick={() => go(`/teams/${teamId}/dms/new`)}
            >
              <MessageSquare className="size-[17px]" />
            </Button>
          )}
        </div>
      </aside>
    </>
  )
}
