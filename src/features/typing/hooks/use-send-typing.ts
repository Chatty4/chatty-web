import { useCallback, useEffect, useRef } from "react"

import { useWs } from "@/features/ws"

import { typingDelay } from "../store/typing"

/**
 * Returns a function to call on every change of the text. It sends `typing` at most once per
 * interval and channel. A change that comes too soon waits for the interval to pass instead of
 * being lost, so one letter right after sending a message still shows. Clearing the text or
 * leaving the channel drops what was waiting.
 */
export function useSendTyping(channelId: string): (hasText: boolean) => void {
  const { send } = useWs()
  // channel_id → when I last sent `typing` there. Switching back and forth keeps the limit.
  const lastSentAt = useRef(new Map<string, number>())
  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancel = useCallback(() => {
    if (waiting.current !== null) clearTimeout(waiting.current)
    waiting.current = null
  }, [])

  useEffect(() => cancel, [channelId, cancel])

  return useCallback(
    (hasText: boolean) => {
      if (!hasText) {
        cancel()
        return
      }
      if (waiting.current !== null) return

      const sendNow = () => {
        waiting.current = null
        lastSentAt.current.set(channelId, Date.now())
        send({ type: "typing", channel_id: channelId })
      }
      const delay = typingDelay(lastSentAt.current.get(channelId), Date.now())
      if (delay === 0) sendNow()
      else waiting.current = setTimeout(sendNow, delay)
    },
    [channelId, send, cancel],
  )
}
