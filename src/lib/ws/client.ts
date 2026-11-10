// One WebSocket connection: heartbeat, message parsing, close forwarding.
// Reconnect logic lives in WsProvider (features/ws).
// Contract: chatty-infra/docs/api-chat.md#get-ws and docs/events.md.

import { CHAT_API_URL } from "@/lib/config"
import { createHeartbeat, type Heartbeat } from "./heartbeat"
import type { InboundWsMessage, OutboundWsMessage } from "./types"

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
 * Manages one WebSocket connection. Sends a heartbeat with the current tab
 * visibility when it opens, every 20 s and whenever the tab is shown or hidden.
 * Calling `close()` is intentional and does not trigger `onClose`; a
 * server-initiated close does.
 */
export class WsClient {
  private readonly socket: WebSocket
  private readonly callbacks: WsClientCallbacks
  private readonly heartbeat: Heartbeat
  private intentional = false

  constructor(token: string, callbacks: WsClientCallbacks) {
    this.callbacks = callbacks
    this.heartbeat = createHeartbeat({
      send: (message) => this.send(message),
      isVisible: () => document.visibilityState === "visible",
    })
    this.socket = new WebSocket(buildWsUrl(token))
    this.socket.addEventListener("open", this.handleOpen)
    this.socket.addEventListener("message", this.handleMessage)
    this.socket.addEventListener("close", this.handleClose)
    document.addEventListener("visibilitychange", this.handleVisibility)
  }

  private handleOpen = () => {
    this.heartbeat.start()
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
      this.heartbeat.beat()
    }
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
    this.heartbeat.stop()
    document.removeEventListener("visibilitychange", this.handleVisibility)
    this.socket.removeEventListener("open", this.handleOpen)
    this.socket.removeEventListener("message", this.handleMessage)
    this.socket.removeEventListener("close", this.handleClose)
  }
}
