import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth"

import { useMessages } from "../context"
import { useChannelMembers } from "../hooks/use-channel-members"
import { useMemberNames } from "../hooks/use-member-names"
import { MessageItem } from "./message-item"
import { MessageComposer } from "./message-composer"
import { MessageListSkeleton } from "./message-skeleton"
import { extractMentionIds } from "../utils/mentions"
import type { SidebarChannel } from "@/features/channels/types"

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageListProps = {
  channelId: string
  teamId: string
  /** SidebarChannel used to check archived status and pass members for autocomplete. */
  channel: SidebarChannel | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MessageList({ channelId, teamId, channel }: MessageListProps) {
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
    return prev.author_id === msg.author_id
  }

  const archived = channel?.archived ?? false

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

        {/* Top anchor: load more or beginning-of-history notice */}
        {!loading && (
        <div className="flex justify-center px-4 py-4">
          {hasMore ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void loadMoreHistory(channelId)}
            >
              Load earlier messages
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">
              You've reached the beginning of this channel.
            </span>
          )}
        </div>
        )}

        {/* Empty state */}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center gap-1 py-16 text-center">
            <strong className="text-sm">No messages yet</strong>
            <span className="text-sm text-muted-foreground">
              Start the conversation below.
            </span>
          </div>
        )}

        {/* Message rows */}
        <div className="pb-2">
          {messages.map((message, index) => {
            const own = !!user && message.author_id === user.id
            return (
            <MessageItem
              key={message.id}
              message={message}
              authorName={names[message.author_id] ?? "Unknown member"}
              names={names}
              grouped={isGrouped(index)}
              own={own}
              editable={own && message.deleted_at === null}
              onEdit={(messageId, body) => edit(channelId, messageId, body)}
              onDelete={(messageId) => remove(channelId, messageId)}
              onRetry={retry}
            />
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
