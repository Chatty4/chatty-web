import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ArrowDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth"
import { cn } from "@/lib/utils"

import { useMessages } from "../context"
import { useChannelMembers } from "../hooks/use-channel-members"
import { useMemberNames } from "../hooks/use-member-names"
import { useScrollAnchor } from "../hooks/use-scroll-anchor"
import { useWhenVisible } from "../hooks/use-when-visible"
import { HistoryTop } from "./history-top"
import { MessageItem } from "./message-item"
import { MessageComposer } from "./message-composer"
import { MessageListSkeleton } from "./message-skeleton"
import { DayDivider } from "./day-divider"
import { dayKey, formatDayLabel } from "../utils/dates"
import { extractMentionIds } from "../utils/mentions"
import {
  canDelete,
  canEdit,
  canPin,
  canReact,
  type Actor,
  type ChannelAccess,
  type TeamRole,
} from "../utils/permissions"
import type { SidebarChannel } from "@/features/channels/types"

/** Start fetching older messages this far before the user reaches the top. */
const PREFETCH_MARGIN = "300px 0px 0px 0px"

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
  const {
    getChannel,
    loadChannel,
    loadMoreHistory,
    send,
    retry,
    discard,
    edit,
    remove,
    setReaction,
    setPinned,
    getDraft,
    setDraft,
  } = useMessages()

  const channelState = getChannel(channelId)
  const channelMissing = !channelState

  // Load this channel on mount, when channelId changes, and after /sync dropped it.
  useEffect(() => {
    loadChannel(channelId)
  }, [channelId, channelMissing, loadChannel])

  const messages = useMemo(() => channelState?.messages ?? [], [channelState])
  const hasMore = channelState?.hasMore ?? false
  const loading = channelState?.loading ?? true
  const loadFailed = channelState?.loadFailed ?? false
  const loadingMore = channelState?.loadingMore ?? false
  const loadMoreFailed = channelState?.loadMoreFailed ?? false

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
  const showJump = farFromBottom || newCount > 0

  // ── Older history ────────────────────────────────────────────────────────────
  const { capture: captureAnchor, clear: clearAnchor } = useScrollAnchor(
    listRef,
    `${messages[0]?.id}:${hasMore}`,
  )

  const loadOlder = () => {
    captureAnchor()
    void loadMoreHistory(channelId)
  }

  const sentinelRef = useWhenVisible<HTMLDivElement>({
    rootRef: listRef,
    // A failed page waits for the user: retrying by itself would hammer the server.
    enabled: hasMore && !loading && !loadingMore && !loadMoreFailed,
    resetKey: channelId,
    rootMargin: PREFETCH_MARGIN,
    onVisible: loadOlder,
  })

  const scrollToBottom =(behavior: ScrollBehavior = "smooth") => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
    setScrollState(resetScroll)
  }

  // On channel switch: jump to bottom immediately.
  useEffect(() => {
    prevLengthRef.current = messages.length
    lastKeyRef.current = undefined
    clearAnchor()
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
    // The user can keep scrolling during the fetch: hold on to what they see now.
    if (loadingMore) captureAnchor()
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const nextAtBottom = distanceFromBottom < 40
    const nextFar = distanceFromBottom > el.clientHeight
    // Keep the same object when nothing changed, or every scroll event re-renders the list.
    setScrollState((s) => {
      const nextCount = nextAtBottom ? 0 : s.newCount
      return s.atBottom === nextAtBottom && s.farFromBottom === nextFar && s.newCount === nextCount
        ? s
        : { atBottom: nextAtBottom, farFromBottom: nextFar, newCount: nextCount }
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

  // Stable, so MessageItem's memo holds when something else in the list changes.
  const onSetReaction = useCallback(
    (messageId: string, emoji: string, on: boolean) => setReaction(channelId, messageId, emoji, on),
    [channelId, setReaction],
  )
  const onSetPinned = useCallback(
    (messageId: string, on: boolean) => setPinned(channelId, messageId, on),
    [channelId, setPinned],
  )
  const onEdit = useCallback(
    (messageId: string, body: string) => edit(channelId, messageId, body),
    [channelId, edit],
  )
  const onDelete = useCallback(
    (messageId: string) => remove(channelId, messageId),
    [channelId, remove],
  )

  const archived = channel?.archived ?? false

  // ── Permissions (D-05) ───────────────────────────────────────────────────────
  const actor: Actor | null = user ? { userId: user.id, teamRole } : null
  const access: ChannelAccess | null = channel
    ? { kind: channel.kind, archived: channel.archived, myRole: channel.my.role }
    : null

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Scrollable message area */}
      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {loading && <MessageListSkeleton />}

        {/* The welcome block only once the very start of the history is loaded */}
        {!loading && !loadFailed && !hasMore && intro}

        {loadFailed && (
          <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 text-center">
            <strong className="font-semibold">Couldn't load this channel.</strong>
            <span role="alert" className="text-muted-foreground">
              Check your connection and try again.
            </span>
            <Button variant="secondary" size="sm" onClick={() => loadChannel(channelId)}>
              Try again
            </Button>
          </div>
        )}

        {!loading && !loadFailed && (
          <HistoryTop
            hasMore={hasMore}
            loadingMore={loadingMore}
            failed={loadMoreFailed}
            endLabel={channel?.kind === "dm" ? "Beginning of conversation" : "Beginning of channel"}
            onLoadMore={loadOlder}
            sentinelRef={sentinelRef}
          />
        )}

        {/* Empty state */}
        {!loading && !loadFailed && messages.length === 0 && (
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
              canReact={canReact(message, access)}
              onSetReaction={onSetReaction}
              canPin={canPin(message, access)}
              onSetPinned={onSetPinned}
              onEdit={onEdit}
              onDelete={onDelete}
              onRetry={retry}
              onDiscard={discard}
              onChannelArchived={onChannelArchived}
            />
            </Fragment>
            )
          })}
        </div>
      </div>

      {/* Jump-to-latest: centred pill just above the composer, fades in when needed */}
      <Button
        size={newCount > 0 ? "sm" : "icon"}
        inert={!showJump}
        onClick={() => scrollToBottom()}
        aria-label={
          newCount
            ? `Jump to latest, ${newCount} new message${newCount === 1 ? "" : "s"}`
            : "Jump to latest"
        }
        className={cn(
          "absolute bottom-4 left-1/2 z-10 min-w-[34px] -translate-x-1/2 rounded-full shadow-lg transition-[opacity,translate] duration-150 motion-reduce:transition-none",
          showJump ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        <ArrowDown className="size-[15px]" />
        {newCount > 0 && <span>{newCount} new</span>}
      </Button>
      </div>

      {/* Composer */}
      {/* Keyed so a draft can never be sent to the channel opened after it. */}
      <MessageComposer
        key={channelId}
        members={mentionCandidates}
        archived={archived}
        initialDraft={getDraft(channelId)}
        onDraftChange={(text) => setDraft(channelId, text)}
        onSend={async (body) => {
          if ((await send(channelId, body)) === "channel_archived") onChannelArchived()
        }}
      />
    </div>
  )
}
