import { useCallback, useRef } from "react"

import { useWs } from "@/features/ws"

import { canSendTyping } from "../store/typing"

/**
 * Returns a function that tells the channel I'm typing. Call it on every change: it sends at
 * most once per interval and channel. Lost when the socket is closed, and that's fine.
 */
export function useSendTyping(channelId: string): () => void {
  const { send } = useWs()
  // channel_id → when I last sent `typing` there. Switching back and forth keeps the limit.
  const lastSentAt = useRef(new Map<string, number>())

  return useCallback(() => {
    const now = Date.now()
    if (!canSendTyping(lastSentAt.current.get(channelId), now)) return
    lastSentAt.current.set(channelId, now)
    send({ type: "typing", channel_id: channelId })
  }, [channelId, send])
}
