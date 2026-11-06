// WS lifecycle manager: connect on mount, reconnect with backoff on server
// close codes, refresh the token on 4001, POST /sync after every reconnect,
// and proactively reconnect ~1 min before the token expires.
//
// Contract: chatty-infra/docs/api-chat.md#get-ws and docs/events.md#ws-close.
// Mounted inside AppLayout (authenticated routes only) — no auth guard needed.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"

import { useAuth } from "@/features/auth"
import { ApiError, isServerUnavailable } from "@/lib/api"
import { isSessionRejected } from "@/lib/api-error"
import { freshAccessToken, getAccessExpiry, getAccessToken, refreshSession } from "@/lib/session"
import { backoffDelay, reconnectDelay, retryWithBackoff } from "@/lib/ws/backoff"
import { WsClient } from "@/lib/ws/client"
import { createSyncGate } from "@/lib/ws/sync-gate"
import type { InboundWsMessage, OutboundWsMessage } from "@/lib/ws/types"

import { WsContext } from "./context"
import { syncRequest } from "./fetchers/ws-fetchers"
import type { SyncCursors, SyncResponse, WsStatus } from "./types"

/** How long before token `exp` to proactively reconnect with a fresh token. */
const PROACTIVE_MS = 60_000

/** How long a connection must stay open before the backoff starts over. */
const STABLE_MS = 30_000

export function WsProvider({ children }: { children: ReactNode }) {
  const { logout } = useAuth()
  const [status, setStatus] = useState<WsStatus>("connecting")

  const clientRef = useRef<WsClient | null>(null)
  const cursorsRef = useRef<SyncCursors>({})
  const msgHandlers = useRef(new Set<(msg: InboundWsMessage) => void>())
  const syncHandlersRef = useRef(new Set<(res: SyncResponse) => void | Promise<void>>())
  const reconnectHandlersRef = useRef(new Set<() => void>())

  useEffect(() => {
    let alive = true
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let proactiveTimer: ReturnType<typeof setTimeout> | undefined
    let waitingToReconnect = false
    let attempt = 0
    let connectedOnce = false
    let openedAt = 0
    let tokenRejected = false

    const gate = createSyncGate<InboundWsMessage>((msg) => {
      msgHandlers.current.forEach((h) => h(msg))
    })

    function doSync() {
      return gate.run(async () => {
        const res = await retryWithBackoff(() => syncRequest(cursorsRef.current), {
          shouldRetry: isServerUnavailable,
          isCancelled: () => !alive,
        })
        if (!alive) return
        await Promise.all([...syncHandlersRef.current].map((h) => h(res)))
      })
    }

    function scheduleReconnect(delay: number) {
      waitingToReconnect = true
      reconnectTimer = setTimeout(() => {
        waitingToReconnect = false
        void connect()
      }, delay)
    }

    // The browser knows the network is back before our backoff timer does.
    function handleOnline() {
      if (!waitingToReconnect) return
      clearTimeout(reconnectTimer)
      waitingToReconnect = false
      attempt = 0
      void connect()
    }

    async function connect() {
      if (!alive) return
      clearTimeout(reconnectTimer)

      let token: string
      try {
        // After 4001 the server said this token is over, whatever the local expiry says.
        token = tokenRejected ? await refreshSession(getAccessToken()) : await freshAccessToken()
        tokenRejected = false
      } catch (error) {
        if (!alive) return
        // Only a rejected session stops here. Offline, down or rate limited: keep trying.
        if (isSessionRejected(error)) {
          setStatus("disconnected")
        } else {
          const retryAfterMs = error instanceof ApiError ? (error.retryAfter ?? 0) * 1000 : 0
          setStatus("reconnecting")
          scheduleReconnect(Math.max(backoffDelay(attempt++), retryAfterMs))
        }
        return
      }
      if (!alive) return

      setStatus(connectedOnce ? "reconnecting" : "connecting")

      const client = new WsClient(token, {
        onOpen() {
          const reconnected = connectedOnce
          connectedOnce = true
          openedAt = Date.now()
          setStatus("connected")
          // Also on the first open: a channel may have loaded before the socket connected.
          const synced =
            Object.keys(cursorsRef.current).length > 0 ? doSync() : Promise.resolve()
          // After the held-back messages are out, so a fresh GET /unread doesn't count them twice.
          if (reconnected) {
            void synced.then(() => {
              if (alive) reconnectHandlersRef.current.forEach((h) => h())
            })
          }
        },

        onMessage: gate.receive,

        onClose(code) {
          clientRef.current = null
          clearTimeout(proactiveTimer)
          if (!alive) return

          if (code === 4003) {
            setStatus("disconnected")
            void logout()
            return
          }

          // Only a connection that lasted resets the backoff: a server that accepts
          // and then closes straight away must not be hammered.
          if (openedAt && Date.now() - openedAt >= STABLE_MS) attempt = 0
          openedAt = 0
          tokenRejected = code === 4001
          setStatus("reconnecting")
          scheduleReconnect(reconnectDelay(code, attempt++))
        },
      })

      clientRef.current = client

      // Proactively reconnect before the token expires so the server never
      // closes with 4001. The new connect() calls freshAccessToken() which
      // will pick up the already-refreshed token from session.ts.
      // session.ts measures the expiry on this device's clock: comparing the token's exp
      // with a wrong clock here would reconnect in a loop.
      const expiresAt = getAccessExpiry()
      if (expiresAt !== null) {
        const delay = Math.max(0, expiresAt - PROACTIVE_MS - Date.now())
        proactiveTimer = setTimeout(() => {
          client.close()
          clientRef.current = null
          attempt = 0
          void connect()
        }, delay)
      }
    }

    window.addEventListener("online", handleOnline)
    void connect()

    return () => {
      alive = false
      window.removeEventListener("online", handleOnline)
      clearTimeout(reconnectTimer)
      clearTimeout(proactiveTimer)
      clientRef.current?.close()
      clientRef.current = null
      setStatus("disconnected")
    }
  }, [logout]) // logout is stable (useCallback in useAuthState); listed for exhaustive-deps

  const send = useCallback((msg: OutboundWsMessage) => {
    clientRef.current?.send(msg)
  }, [])

  const subscribe = useCallback((handler: (msg: InboundWsMessage) => void) => {
    msgHandlers.current.add(handler)
    return () => { msgHandlers.current.delete(handler) }
  }, [])

  const setCursors = useCallback((cursors: SyncCursors) => {
    cursorsRef.current = cursors
  }, [])

  const onSync = useCallback((handler: (res: SyncResponse) => void | Promise<void>) => {
    syncHandlersRef.current.add(handler)
    return () => { syncHandlersRef.current.delete(handler) }
  }, [])

  const onReconnect = useCallback((handler: () => void) => {
    reconnectHandlersRef.current.add(handler)
    return () => { reconnectHandlersRef.current.delete(handler) }
  }, [])

  return (
    <WsContext.Provider value={{ status, send, subscribe, setCursors, onSync, onReconnect }}>
      {children}
    </WsContext.Provider>
  )
}
