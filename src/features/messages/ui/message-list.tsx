import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ArrowDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth"

import { useMessages } from "../context"
import { useChannelMembers } from "../hooks/use-channel-members"
import { useMemberNames } from "../hooks/use-member-names"
import { MessageItem } from "./message-item"
import { MessageComposer } from "./message-composer"
import { MessageListSkeleton } from "./message-skeleton"
import { DayDivider } from "./day-divider"
import { dayKey, formatDayLabel } from "../utils/dates"
import { extractMentionIds } from "../utils/mentions"
import { canDelete, canEdit, type Actor, type ChannelAccess, type TeamRole } from "../utils/permissions"
import type { SidebarChannel } from "@/features/channels/types"

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageListProps = {
  channelId: string
  teamId: string
  /** The channel from my sidebar (channels or DMs); null when I'm not a member. */
  channel: SidebarChannel | null
  /** My role in this team, for D-05 delete rights. */
  teamRole: TeamRole | null
  /** Refreshes channel data when the server reports the channel was archived. */
  onChannelArchived: () => void
  /** Welcome block shown above the first message once the start of history is loaded. */
  intro?: ReactNode
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MessageList({
  channelId,
  teamId,
  channel,
  teamRole,
  onChannelArchived,
  intro,
}: MessageListProps) {
  const { user } = useAuth()
  const { getChannel, loadChannel, loadMoreHistory, send, retry, edit, remove } =
    useMessages()

  // Load this channel on mount / when channelId changes.
  useEffect(() => {
    loadChannel(channelId)
  }, [channelId, loadChannel])

  const channelState = getChannel(channelId)
  const messages = useMemo(() => channelState?.messages ?? [], [channelState])
  const hasMore = channelState?.hasMore ?? false
  const loading = channelState?.loading ?? true

  // ── Name resolution for authors and <@id> mentions ───────────────────────────
  const userIds = useMemo(
    () => [...new Set(messages.flatMap((m) => [m.author_id, ...extractMentionIds(m.body)]))],
    [messages],
  )
  const memberNames = useMemberNames(teamId, userIds)

  // ── Channel members (for @mention autocomplete) ──────────────────────────────
  const mentionCandidates = useChannelMembers(channelId, teamId)

  const names = useMemo(() => {
    const merged: Record<string, string> = {}
    for (const c of mentionCandidates) merged[c.id] = c.display_name
    return { ...merged, ...memberNames }
  }, [mentionCandidates, memberNames])

  // ── Scroll management ────────────────────────────────────────────────────────
  const listRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(messages.length)
  const lastMessage = messages.at(-1)
  const lastKey = lastMessage ? (lastMessage.client_msg_id ?? lastMessage.id) : undefined
  const lastKeyRef = useRef<string | undefined>(undefined)

  type ScrollState = { atBottom: boolean; farFromBottom: boolean; newCount: number }
  const resetScroll: ScrollState = { atBottom: true, farFromBottom: false, newCount: 0 }
  const [scrollState, setScrollState] = useState<ScrollState>(resetScroll)
  const { atBottom, farFromBottom, newCount } = scrollState

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
    setScrollState(resetScroll)
  }

  // On channel switch: jump to bottom immediately.
  useEffect(() => {
    prevLengthRef.current = messages.length
    lastKeyRef.current = undefined
    // Defer the scroll + state reset into rAF so DOM is ready.
    requestAnimationFrame(() => {
      const el = listRef.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "instant" as ScrollBehavior })
      setScrollState(resetScroll)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId])

  // React to the newest message changing (older history prepended at the top is ignored):
  // first load jumps to the bottom, my own send always scrolls, others scroll only
  // when I'm already at the bottom and otherwise bump the "new" badge.
  useEffect(() => {
    const previousKey = lastKeyRef.current
    const added = messages.length - prevLengthRef.current
    lastKeyRef.current = lastKey
    prevLengthRef.current = messages.length
    if (!lastKey || lastKey === previousKey) return

    if (previousKey === undefined) {
      requestAnimationFrame(() => scrollToBottom("instant" as ScrollBehavior))
    } else if ((user && lastMessage?.author_id === user.id) || atBottom) {
      requestAnimationFrame(() => scrollToBottom("smooth"))
    } else {
      setScrollState((s) => ({ ...s, newCount: s.newCount + Math.max(added, 1) }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastKey])

  const handleScroll = () => {
    const el = listRef.current
    if (!el) return
    // Load older messages when scrolled near the top.
    if (el.scrollTop < 80 && hasMore) void loadMoreHistory(channelId)
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setScrollState({
      atBottom: distanceFromBottom < 40,
      farFromBottom: distanceFromBottom > el.clientHeight,
      newCount: distanceFromBottom < 40 ? 0 : scrollState.newCount,
    })
  }

  // ── Grouping helper ──────────────────────────────────────────────────────────
  // A message is grouped when same author immediately precedes it and it isn't
  // the first real message after a gap (deleted messages break groups).
  const isGrouped = (index: number) => {
    const msg = messages[index]
    const prev = messages[index - 1]
    if (!prev || !msg) return false
    if (prev.deleted_at !== null) return false
    if (dayKey(prev.created_at) !== dayKey(msg.created_at)) return false
    return prev.author_id === msg.author_id
  }

  const archived = channel?.archived ?? false

  // ── Permissions (D-05) ───────────────────────────────────────────────────────
  const actor: Actor | null = user ? { userId: user.id, teamRole } : null
  const access: ChannelAccess | null = channel
    ? { kind: channel.kind, archived: channel.archived, myRole: channel.my.role }
    : null

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Scrollable message area */}
      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {loading && <MessageListSkeleton />}

        {/* The welcome block only once the very start of the history is loaded */}
        {!loading && !hasMore && intro}

        {/* Top anchor: load older history, or the end-of-history notice */}
        {!loading && (
          <div className="pt-[18px] text-center">
            {hasMore ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void loadMoreHistory(channelId)}
              >
                Load earlier messages
              </Button>
            ) : (
              <span className="text-[11px] text-faint-foreground">You’re all caught up</span>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && messages.length === 0 && (
          <>
            <DayDivider label="Today" />
            <div className="flex min-h-[150px] flex-col items-center justify-center text-center text-muted-foreground">
              <strong className="text-foreground">No messages yet</strong>
              <span>Start the conversation below.</span>
            </div>
          </>
        )}

        {/* Message rows, with a divider wherever the day changes */}
        <div className="pb-[22px]">
          {messages.map((message, index) => {
            const own = !!user && message.author_id === user.id
            const previous = messages[index - 1]
            const newDay = !previous || dayKey(previous.created_at) !== dayKey(message.created_at)
            return (
            <Fragment key={message.id}>
            {newDay && <DayDivider label={formatDayLabel(message.created_at)} />}
            <MessageItem
              message={message}
              authorName={names[message.author_id] ?? "Unknown member"}
              names={names}
              grouped={isGrouped(index)}
              own={own}
              canEdit={!!actor && canEdit(message, actor, access)}
              canDelete={!!actor && canDelete(message, actor, access)}
              onEdit={(messageId, body) => edit(channelId, messageId, body)}
              onDelete={(messageId) => remove(channelId, messageId)}
              onRetry={retry}
              onChannelArchived={onChannelArchived}
            />
            </Fragment>
            )
          })}
        </div>
      </div>

      {/* Jump-to-latest FAB */}
      {(farFromBottom || newCount > 0) && (
        <div className="absolute bottom-20 right-6 z-10">
          <Button
            size="sm"
            onClick={() => scrollToBottom()}
            aria-label={
              newCount
                ? `Jump to latest — ${newCount} new message${newCount === 1 ? "" : "s"}`
                : "Jump to latest"
            }
          >
            <ArrowDown className="size-3.5" />
            {newCount > 0 && <span>{newCount} new</span>}
          </Button>
        </div>
      )}

      {/* Composer */}
      <MessageComposer
        members={mentionCandidates}
        archived={archived}
        onSend={(body) => send(channelId, body)}
      />
    </div>
  )
}
