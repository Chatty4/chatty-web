import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDown } from "lucide-react"

import { Button } from "@/components/ui/button"

import { useMessages } from "../context"
import { useMemberNames } from "../hooks/use-member-names"
import { MessageItem } from "./message-item"
import { MessageComposer } from "./message-composer"
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

  // ── Author name resolution ───────────────────────────────────────────────────
  const authorIds = useMemo(
    () => [...new Set(messages.map((m) => m.author_id))],
    [messages],
  )
  const memberNames = useMemberNames(teamId, authorIds)

  // ── Scroll management ────────────────────────────────────────────────────────
  const listRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(messages.length)

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
    // Defer the scroll + state reset into rAF so DOM is ready.
    requestAnimationFrame(() => {
      const el = listRef.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "instant" as ScrollBehavior })
      setScrollState(resetScroll)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId])

  // On new messages: auto-scroll if at bottom, otherwise badge.
  useEffect(() => {
    const added = messages.length - prevLengthRef.current
    prevLengthRef.current = messages.length
    if (added <= 0) return
    if (atBottom) {
      requestAnimationFrame(() => scrollToBottom("smooth"))
    } else {
      setScrollState((s) => ({ ...s, newCount: s.newCount + added }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, atBottom])

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
        {/* Top anchor: load more or beginning-of-history notice */}
        <div className="flex justify-center px-4 py-4">
          {loading ? (
            <span className="text-sm text-muted-foreground">Loading…</span>
          ) : hasMore ? (
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
          {messages.map((message, index) => (
            <MessageItem
              key={message.id}
              message={message}
              authorName={memberNames[message.author_id] ?? message.author_id}
              grouped={isGrouped(index)}
              editable={false /* populated once current user id flows here */}
              onEdit={edit}
              onDelete={remove}
              onRetry={retry}
            />
          ))}
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
        members={[]}
        archived={archived}
        onSend={(body) => send(channelId, body)}
      />
    </div>
  )
}
