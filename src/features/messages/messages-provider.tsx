// Sync-store provider: manages per-channel message state, applies WS events in
// seq order (dedup + gap-fill), handles POST /sync responses after reconnects,
// and supports optimistic send with pending/failed/retry lifecycle.
//
// Contract: chatty-infra/docs/api-chat.md and docs/events.md#client-rules.

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from "react"

import { useAuth } from "@/features/auth"
import { useWs } from "@/features/ws"
import { ApiError } from "@/lib/api"
import type { ChannelEvent } from "@/lib/ws/types"

import { MessagesContext } from "./context"
import {
  deleteMessageApi,
  editMessageApi,
  getChannelEvents,
  getMessages,
  sendMessageApi,
} from "./fetchers/message-fetchers"
import { messagesReducer, type MessagesAction, type MessagesState } from "./store/channel-reducer"
import { selectCursors } from "./store/sequence"
import type { ApiMessage, ChannelState } from "./types"

// ── Gap-fill helper ───────────────────────────────────────────────────────────

type GapFillOk = { ok: true; events: ChannelEvent[]; lastSeq: number }
type GapFillFail = { ok: false }

async function fillGap(channelId: string, afterSeq: number): Promise<GapFillOk | GapFillFail> {
  const allEvents: ChannelEvent[] = []
  let current = afterSeq
  for (;;) {
    try {
      const res = await getChannelEvents(channelId, current)
      allEvents.push(...res.events)
      if (!res.has_more) return { ok: true, events: allEvents, lastSeq: res.last_seq }
      current = res.last_seq
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) return { ok: false }
      throw err
    }
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { subscribe, onSync, setCursors } = useWs()

  // Use a ref for state + a version counter for re-renders so async callbacks
  // always read the latest state without stale-closure issues.
  const stateRef = useRef<MessagesState>({})
  const [, bump] = useReducer((n: number) => n + 1, 0)

  // doDispatch: update the state ref, sync cursors to WsProvider, then re-render.
  // Defined as a stable inner function — captures only refs and stable callbacks.
  const setCursorsRef = useRef(setCursors)
  useEffect(() => { setCursorsRef.current = setCursors }, [setCursors])

  const doDispatch = useCallback((action: MessagesAction) => {
    stateRef.current = messagesReducer(stateRef.current, action)
    setCursorsRef.current(selectCursors(stateRef.current))
    bump()
  }, [bump])

  // Keep a stable ref to the latest user id for use inside async callbacks.
  const userIdRef = useRef(user?.id)
  useEffect(() => { userIdRef.current = user?.id }, [user?.id])

  // Track in-progress gap fills per channel to avoid concurrent fetches.
  const gapFilling = useRef(new Set<string>())

  // ── WS event subscription ────────────────────────────────────────────────────
  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type !== "event") return
      const { event } = msg
      const userId = userIdRef.current
      if (!userId) return
      const ch: ChannelState | undefined = stateRef.current[event.channel_id]
      if (!ch) return // channel not loaded — ignore

      if (event.seq <= ch.lastSeq) return // dedup

      if (event.seq === ch.lastSeq + 1) {
        doDispatch({ type: "APPLY_EVENT", channelId: event.channel_id, event, currentUserId: userId })
        return
      }

      // Gap: fetch missing events then apply.
      if (gapFilling.current.has(event.channel_id)) return
      gapFilling.current.add(event.channel_id)
      void (async () => {
        try {
          const result = await fillGap(event.channel_id, ch.lastSeq)
          if (result.ok) {
            doDispatch({ type: "APPLY_EVENTS", channelId: event.channel_id, events: result.events, lastSeq: result.lastSeq, currentUserId: userId })
            // Dedup handles if this event was already in the batch.
            doDispatch({ type: "APPLY_EVENT", channelId: event.channel_id, event, currentUserId: userId })
          } else {
            // gap_too_large: discard and reload from history
            try {
              const res = await getMessages(event.channel_id)
              doDispatch({ type: "RELOAD", channelId: event.channel_id, messages: res.messages, lastSeq: res.last_seq, hasMore: res.has_more })
            } catch { /* leave stale */ }
          }
        } finally {
          gapFilling.current.delete(event.channel_id)
        }
      })()
    })
  }, [subscribe, doDispatch])

  // ── Sync response handler ────────────────────────────────────────────────────
  useEffect(() => {
    return onSync((syncRes) => {
      const userId = userIdRef.current
      if (!userId) return
      void (async () => {
        for (const [channelId, result] of Object.entries(syncRes.channels)) {
          if ("error" in result) {
            if (result.error === "cannot_read_channel") {
              doDispatch({ type: "DROP_CHANNEL", channelId })
            }
            continue
          }
          if (result.gap_too_large) {
            try {
              const res = await getMessages(channelId)
              doDispatch({ type: "RELOAD", channelId, messages: res.messages, lastSeq: res.last_seq, hasMore: res.has_more })
            } catch { /* leave stale */ }
            continue
          }
          doDispatch({ type: "APPLY_EVENTS", channelId, events: result.events, lastSeq: result.last_seq, currentUserId: userId })
        }
      })()
    })
  }, [onSync, doDispatch])

  // ── Public API ────────────────────────────────────────────────────────────────

  const getChannel = useCallback(
    (channelId: string): ChannelState | undefined => stateRef.current[channelId],
    [],
  )

  const loadChannel = useCallback(
    (channelId: string) => {
      if (stateRef.current[channelId]) return
      doDispatch({ type: "LOAD_START", channelId })
      getMessages(channelId)
        .then((res) => {
          doDispatch({ type: "LOAD_DONE", channelId, messages: res.messages, lastSeq: res.last_seq, hasMore: res.has_more })
        })
        .catch(() => {
          doDispatch({ type: "DROP_CHANNEL", channelId })
        })
    },
    [doDispatch],
  )

  const loadMoreHistory = useCallback(async (channelId: string) => {
    const ch = stateRef.current[channelId]
    if (!ch || !ch.hasMore || ch.loading) return
    const oldestSeq = ch.messages.find((m) => m.seq > 0)?.seq
    if (!oldestSeq) return
    const res = await getMessages(channelId, oldestSeq)
    doDispatch({ type: "PREPEND", channelId, messages: res.messages, hasMore: res.has_more })
  }, [doDispatch])

  const send = useCallback(async (channelId: string, body: string) => {
    const userId = userIdRef.current ?? ""
    const clientMsgId = crypto.randomUUID()
    doDispatch({
      type: "OPTIMISTIC_ADD",
      channelId,
      message: {
        id: clientMsgId,
        channel_id: channelId,
        seq: 0,
        author_id: userId,
        body,
        file_ids: [],
        attachments: [],
        mentions: [],
        reactions: [],
        pinned: false,
        edited_at: null,
        deleted_at: null,
        created_at: new Date().toISOString(),
        client_msg_id: clientMsgId,
        status: "pending",
      },
    })
    try {
      const confirmed: ApiMessage = await sendMessageApi(channelId, body, clientMsgId)
      doDispatch({ type: "OPTIMISTIC_CONFIRM", channelId, clientMsgId, confirmed })
    } catch {
      doDispatch({ type: "OPTIMISTIC_FAIL", channelId, clientMsgId })
    }
  }, [doDispatch])

  const retry = useCallback(async (channelId: string, clientMsgId: string) => {
    const ch = stateRef.current[channelId]
    const msg = ch?.messages.find((m) => m.client_msg_id === clientMsgId)
    if (!msg) return
    doDispatch({ type: "OPTIMISTIC_RETRY", channelId, clientMsgId })
    try {
      const confirmed = await sendMessageApi(channelId, msg.body, clientMsgId)
      doDispatch({ type: "OPTIMISTIC_CONFIRM", channelId, clientMsgId, confirmed })
    } catch {
      doDispatch({ type: "OPTIMISTIC_FAIL", channelId, clientMsgId })
    }
  }, [doDispatch])

  // Edit and delete apply the REST answer right away, so the change shows even if the
  // socket is down; the matching WS event later applies the same values (idempotent).
  const edit = useCallback(async (channelId: string, messageId: string, body: string) => {
    try {
      const updated = await editMessageApi(messageId, body)
      doDispatch({
        type: "MESSAGE_EDITED",
        channelId,
        edit: {
          message_id: updated.id,
          body: updated.body,
          mentions: updated.mentions,
          edited_at: updated.edited_at ?? new Date().toISOString(),
        },
      })
    } catch (err) {
      if (err instanceof ApiError && err.code === "message_deleted") {
        doDispatch({ type: "MESSAGE_DELETED", channelId, messageId, deletedAt: new Date().toISOString() })
      }
      throw err
    }
  }, [doDispatch])

  const remove = useCallback(async (channelId: string, messageId: string) => {
    await deleteMessageApi(messageId)
    doDispatch({ type: "MESSAGE_DELETED", channelId, messageId, deletedAt: new Date().toISOString() })
  }, [doDispatch])

  return (
    <MessagesContext.Provider value={{ getChannel, loadChannel, loadMoreHistory, send, retry, edit, remove }}>
      {children}
    </MessagesContext.Provider>
  )
}
