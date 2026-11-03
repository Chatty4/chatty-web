// WS lifecycle manager: connect on mount, reconnect with backoff on server
// close codes, refresh the token on 4001, POST /sync after every reconnect,
// and proactively reconnect ~1 min before the token expires.
//
// Contract: chatty-infra/docs/api-chat.md#get-ws and docs/events.md#ws-close.
// Mounted inside AppLayout (authenticated routes only) — no auth guard needed.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"

import { useAuth } from "@/features/auth"
import { freshAccessToken } from "@/lib/session"
import { backoffDelay } from "@/lib/ws/backoff"
import { WsClient } from "@/lib/ws/client"
import type { InboundWsMessage, OutboundWsMessage } from "@/lib/ws/types"

import { WsContext } from "./context"
import { syncRequest } from "./fetchers/ws-fetchers"
import type { SyncCursors, SyncResponse, WsStatus } from "./types"

/** How long before token `exp` to proactively reconnect with a fresh token. */
const PROACTIVE_MS = 60_000

/** Codes that deserve exponential backoff (server is restarting). */
const BACKOFF_CODES = new Set([1001, 1011, 1012])

function parseTokenExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]!)) as Record<string, unknown>
    return typeof payload.exp === "number" ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export function WsProvider({ children }: { children: ReactNode }) {
  const { logout } = useAuth()
  const [status, setStatus] = useState<WsStatus>("connecting")

  const clientRef = useRef<WsClient | null>(null)
  const cursorsRef = useRef<SyncCursors>({})
  const msgHandlers = useRef(new Set<(msg: InboundWsMessage) => void>())
  const syncHandlersRef = useRef(new Set<(res: SyncResponse) => void>())

  useEffect(() => {
    let alive = true
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let proactiveTimer: ReturnType<typeof setTimeout> | undefined
    let attempt = 0
    let connectedOnce = false
    let syncing = false
    let holdQueue: InboundWsMessage[] = []

    function emit(msg: InboundWsMessage) {
      if (syncing) {
        holdQueue.push(msg)
      } else {
        msgHandlers.current.forEach((h) => h(msg))
      }
    }

    async function doSync() {
      syncing = true
      holdQueue = []
      try {
        const res = await syncRequest(cursorsRef.current)
        if (!alive) return
        syncHandlersRef.current.forEach((h) => h(res))
      } catch {
        // Sync failure: still flush so live events are not stuck forever
      } finally {
        syncing = false
        const queued = holdQueue.splice(0)
        queued.forEach((msg) => msgHandlers.current.forEach((h) => h(msg)))
      }
    }

    async function connect() {
      if (!alive) return
      clearTimeout(reconnectTimer)

      let token: string
      try {
        token = await freshAccessToken()
      } catch {
        if (alive) setStatus("disconnected")
        return
      }
      if (!alive) return

      const isReconnect = connectedOnce
      setStatus(isReconnect ? "reconnecting" : "connecting")

      const client = new WsClient(token, {
        onOpen() {
          const wasReconnect = connectedOnce
          connectedOnce = true
          attempt = 0
          setStatus("connected")
          if (wasReconnect) void doSync()
        },

        onMessage: emit,

        onClose(code) {
          clientRef.current = null
          clearTimeout(proactiveTimer)
          if (!alive) return

          if (code === 4003) {
            setStatus("disconnected")
            void logout()
            return
          }

          // All other codes reconnect. Use backoff for server-restart codes.
          const delay = BACKOFF_CODES.has(code) ? backoffDelay(attempt++) : 0
          reconnectTimer = setTimeout(() => void connect(), delay)
        },
      })

      clientRef.current = client

      // Proactively reconnect before the token expires so the server never
      // closes with 4001. The new connect() calls freshAccessToken() which
      // will pick up the already-refreshed token from session.ts.
      const exp = parseTokenExp(token)
      if (exp !== null) {
        const delay = Math.max(0, exp - PROACTIVE_MS - Date.now())
        proactiveTimer = setTimeout(() => {
          client.close()
          clientRef.current = null
          attempt = 0
          void connect()
        }, delay)
      }
    }

    void connect()

    return () => {
      alive = false
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
    cursorsRef.current = { ...cursorsRef.current, ...cursors }
  }, [])

  const onSync = useCallback((handler: (res: SyncResponse) => void) => {
    syncHandlersRef.current.add(handler)
    return () => { syncHandlersRef.current.delete(handler) }
  }, [])

  return (
    <WsContext.Provider value={{ status, send, subscribe, setCursors, onSync }}>
      {children}
    </WsContext.Provider>
  )
}
