// One WebSocket connection: heartbeat, message parsing, close forwarding.
// Reconnect logic lives in WsProvider (features/ws).
// Contract: chatty-infra/docs/api-chat.md#get-ws and docs/events.md.

import { CHAT_API_URL } from "@/lib/config"
import type { InboundWsMessage, OutboundWsMessage } from "./types"

const HEARTBEAT_MS = 20_000

type WsClientCallbacks = {
  onOpen?: () => void
  onMessage: (msg: InboundWsMessage) => void
  /** Called once when the socket closes unexpectedly. Not called after `client.close()`. */
  onClose: (code: number) => void
}

function buildWsUrl(token: string): string {
  const base = CHAT_API_URL.startsWith("/")
    ? `${window.location.origin}${CHAT_API_URL}`
    : CHAT_API_URL
  const url = new URL(`${base}/ws`)
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  url.searchParams.set("token", token)
  return url.toString()
}

/**
 * Manages one WebSocket connection. Sends a heartbeat every 20 s with the
 * current tab visibility flag. Calling `close()` is intentional and does not
 * trigger `onClose`; a server-initiated close does.
 */
export class WsClient {
  private readonly socket: WebSocket
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined
  private intentional = false

  constructor(token: string, private readonly callbacks: WsClientCallbacks) {
    this.socket = new WebSocket(buildWsUrl(token))
    this.socket.addEventListener("open", this.handleOpen)
    this.socket.addEventListener("message", this.handleMessage)
    this.socket.addEventListener("close", this.handleClose)
    document.addEventListener("visibilitychange", this.handleVisibility)
  }

  private handleOpen = () => {
    this.heartbeatTimer = setInterval(this.sendHeartbeat, HEARTBEAT_MS)
    this.callbacks.onOpen?.()
  }

  private handleMessage = ({ data }: MessageEvent<string>) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(data)
    } catch {
      return
    }
    if (typeof parsed === "object" && parsed !== null && "type" in parsed) {
      this.callbacks.onMessage(parsed as InboundWsMessage)
    }
  }

  private handleClose = ({ code }: CloseEvent) => {
    this.teardown()
    if (!this.intentional) {
      this.callbacks.onClose(code)
    }
  }

  private handleVisibility = () => {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.sendHeartbeat()
    }
  }

  private sendHeartbeat = () => {
    this.send({ type: "heartbeat", visible: document.visibilityState === "visible" })
  }

  send(msg: OutboundWsMessage): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg))
    }
  }

  /** Close intentionally — does not trigger `onClose`. */
  close(): void {
    if (this.intentional) return
    this.intentional = true
    this.teardown()
    this.socket.close()
  }

  private teardown() {
    clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = undefined
    document.removeEventListener("visibilitychange", this.handleVisibility)
    this.socket.removeEventListener("open", this.handleOpen)
    this.socket.removeEventListener("message", this.handleMessage)
    this.socket.removeEventListener("close", this.handleClose)
  }
}
