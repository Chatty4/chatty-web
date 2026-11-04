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

import { MessagesContext } from "./context"
import {
  addReactionApi,
  deleteMessageApi,
  editMessageApi,
  getChannelEvents,
  getMessages,
  listPinsApi,
  pinMessageApi,
  removeReactionApi,
  sendMessageApi,
  unpinMessageApi,
} from "./fetchers/message-fetchers"
import {
  messagesReducer,
  oldestLoadedSeq,
  type MessagesAction,
  type MessagesState,
} from "./store/channel-reducer"
import { createEventSequencer, type EventSequencer } from "./store/event-sequencer"
import { planSync, selectCursors } from "./store/sequence"
import type { ApiMessage, ChannelState } from "./types"
import { describePinError } from "./utils/errors"

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

  const reloadChannel = useCallback(async (channelId: string) => {
    try {
      const res = await getMessages(channelId)
      doDispatch({
        type: "RELOAD",
        channelId,
        messages: res.messages,
        lastSeq: res.last_seq,
        hasMore: res.has_more,
      })
    } catch {
      // Stale until the next sync or gap: the cursor didn't move, so nothing is lost.
    }
  }, [doDispatch])

  // ── WS event subscription ────────────────────────────────────────────────────
  const sequencerRef = useRef<EventSequencer | null>(null)

  useEffect(() => {
    const sequencer = createEventSequencer({
      getChannel: (channelId) => stateRef.current[channelId],
      getUserId: () => userIdRef.current,
      dispatch: doDispatch,
      getEvents: getChannelEvents,
      reload: reloadChannel,
    })
    sequencerRef.current = sequencer
    return subscribe((msg) => {
      if (msg.type === "event") sequencer.receive(msg.event)
    })
  }, [subscribe, doDispatch, reloadChannel])

  // ── Sync response handler ────────────────────────────────────────────────────
  // Resolves once reloads are done, so held-back events are released after them.
  useEffect(() => {
    return onSync(async (response) => {
      const userId = userIdRef.current
      if (!userId) return
      const { actions, reload } = planSync(response, userId)
      actions.forEach(doDispatch)
      await Promise.all(reload.map(reloadChannel))
    })
  }, [onSync, doDispatch, reloadChannel])

  // ── Public API ────────────────────────────────────────────────────────────────

  const getChannel = useCallback(
    (channelId: string): ChannelState | undefined => stateRef.current[channelId],
    [],
  )

  const loadChannel = useCallback(
    (channelId: string) => {
      const existing = stateRef.current[channelId]
      if (existing && !existing.loadFailed) return
      doDispatch({ type: "LOAD_START", channelId })
      getMessages(channelId)
        .then((res) => {
          doDispatch({ type: "LOAD_DONE", channelId, messages: res.messages, lastSeq: res.last_seq, hasMore: res.has_more })
        })
        .catch(() => {
          doDispatch({ type: "LOAD_FAIL", channelId })
        })
        .finally(() => sequencerRef.current?.release(channelId))
    },
    [doDispatch],
  )

  const loadMoreHistory = useCallback(async (channelId: string) => {
    const ch = stateRef.current[channelId]
    if (!ch || !ch.hasMore || ch.loading || ch.loadingMore) return
    const beforeSeq = oldestLoadedSeq(ch.messages)
    if (beforeSeq === undefined) return

    doDispatch({ type: "LOAD_MORE_START", channelId })
    try {
      const res = await getMessages(channelId, beforeSeq)
      doDispatch({
        type: "PREPEND",
        channelId,
        messages: res.messages,
        hasMore: res.has_more,
        beforeSeq,
        lastSeq: res.last_seq,
      })
    } catch {
      doDispatch({ type: "LOAD_MORE_FAIL", channelId })
    }
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

  const setReaction = useCallback(
    async (channelId: string, messageId: string, emoji: string, on: boolean) => {
      try {
        await (on ? addReactionApi(messageId, emoji) : removeReactionApi(messageId, emoji))
      } catch (err) {
        if (err instanceof ApiError && err.code === "message_deleted") {
          doDispatch({ type: "MESSAGE_DELETED", channelId, messageId, deletedAt: new Date().toISOString() })
        }
        throw err
      }
    },
    [doDispatch],
  )

  // Both answers apply right away, so a pin shows even with the socket down. The matching
  // event sets the same values, so getting both is safe.
  const setPinned = useCallback(
    async (channelId: string, messageId: string, on: boolean) => {
      try {
        if (on) {
          const pin = await pinMessageApi(channelId, messageId)
          doDispatch({ type: "MESSAGE_PINNED", channelId, info: pin })
        } else {
          await unpinMessageApi(channelId, messageId)
          doDispatch({ type: "MESSAGE_UNPINNED", channelId, messageId })
        }
      } catch (err) {
        if (err instanceof ApiError && err.code === "message_deleted") {
          doDispatch({ type: "MESSAGE_DELETED", channelId, messageId, deletedAt: new Date().toISOString() })
        }
        throw err
      }
    },
    [doDispatch],
  )

  const loadPins = useCallback(
    async (channelId: string) => {
      if (stateRef.current[channelId]?.pins?.status === "loading") return
      doDispatch({ type: "PINS_LOAD_START", channelId })
      try {
        const { pins } = await listPinsApi(channelId)
        doDispatch({ type: "PINS_LOADED", channelId, pins })
      } catch (err) {
        doDispatch({ type: "PINS_LOAD_FAIL", channelId, error: describePinError(err) })
      }
    },
    [doDispatch],
  )

  // Refs, not state: only the composer of the open channel reads these, when it mounts.
  const draftsRef = useRef(new Map<string, string>())
  const getDraft = useCallback((channelId: string) => draftsRef.current.get(channelId) ?? "", [])
  const setDraft = useCallback((channelId: string, text: string) => {
    if (text) draftsRef.current.set(channelId, text)
    else draftsRef.current.delete(channelId)
  }, [])

  return (
    <MessagesContext.Provider value={{ getChannel, loadChannel, loadMoreHistory, send, retry, edit, remove, setReaction, setPinned, loadPins, getDraft, setDraft }}>
      {children}
    </MessagesContext.Provider>
  )
}
