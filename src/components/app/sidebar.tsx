import { Hash, Lock, MessageSquare, Plus, Search, X } from "lucide-react"
import { Link, useMatches, useParams } from "react-router"

import { Button } from "@/components/ui/button"
import { useChannels } from "@/features/channels"
import { useAuth } from "@/features/auth"
import { cn } from "@/lib/utils"

import { UserMenu } from "./user-menu"

function useActiveChannelId(): string | null {
  const matches = useMatches()
  for (let i = matches.length - 1; i >= 0; i--) {
    const id = (matches[i].params as { channelId?: string }).channelId
    if (id) return id
  }
  return null
}

function dmDisplayName(
  dmMemberIds: string[],
  myUserId: string,
  memberNames: Record<string, string>,
): string {
  const others = dmMemberIds.filter((id) => id !== myUserId)
  if (others.length === 0) return "Just you"
  return others.map((id) => memberNames[id] ?? "…").join(", ")
}

type SidebarProps = {
  open: boolean
  onClose: () => void
}

/** The workspace column: team name header, channels, DMs, and user menu. */
export function Sidebar({ open, onClose }: SidebarProps) {
  const { teamId = "" } = useParams()
  const activeChannelId = useActiveChannelId()
  const { channels, dms, memberNames } = useChannels()
  const { user } = useAuth()
  const myUserId = user?.id ?? ""

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
          open ? "translate-x-0 shadow-[0_8px_28px_var(--shadow)]" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-3">
          <span className="truncate text-sm font-semibold">Channels</span>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Close sidebar"
            onClick={onClose}
          >
            <X className="size-[18px]" />
          </Button>
        </div>

        {/* Nav */}
        <nav
          aria-label="Channels and direct messages"
          className="flex-1 overflow-y-auto px-1.5 py-2"
        >
          {/* Channels section */}
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold text-muted-foreground">Channels</span>
            <Link
              to={`/teams/${teamId}/channels/new`}
              aria-label="Create channel"
              onClick={onClose}
              className="rounded-md p-0.5 text-muted-foreground outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-3.5" />
            </Link>
          </div>

          {channels.map((ch) => {
            const isActive = ch.id === activeChannelId
            const Icon = ch.kind === "private" ? Lock : Hash
            return (
              <Link
                key={ch.id}
                to={`/teams/${teamId}/channels/${ch.id}`}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-surface-hover font-medium text-foreground"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                  ch.archived && "opacity-50",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate">{ch.name}</span>
                {ch.archived && (
                  <span className="ml-auto shrink-0 text-[10px] text-faint-foreground">archived</span>
                )}
              </Link>
            )
          })}

          <Link
            to={`/teams/${teamId}/channels/browse`}
            onClick={onClose}
            className="mt-0.5 flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="size-3.5 shrink-0" />
            <span>Browse channels</span>
          </Link>

          {/* DMs section */}
          <div className="mb-1 mt-4 flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold text-muted-foreground">Direct messages</span>
            <Link
              to={`/teams/${teamId}/dms/new`}
              aria-label="New direct message"
              onClick={onClose}
              className="rounded-md p-0.5 text-muted-foreground outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-3.5" />
            </Link>
          </div>

          {dms.map((dm) => {
            const isActive = dm.id === activeChannelId
            const label = dmDisplayName(dm.dm_member_ids ?? [], myUserId, memberNames)
            return (
              <Link
                key={dm.id}
                to={`/teams/${teamId}/channels/${dm.id}`}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-surface-hover font-medium text-foreground"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <MessageSquare className="size-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            )
          })}

          {dms.length === 0 && channels.length === 0 && (
            <p className="px-2 pt-2 text-[13px] text-faint-foreground">
              No channels yet.
            </p>
          )}
        </nav>

        {/* User menu */}
        <div className="flex min-h-[66px] shrink-0 items-center border-t px-2 py-2.5">
          <UserMenu />
        </div>
      </aside>
    </>
  )
}
