import { useCallback, useRef, useState } from "react"

import { forwardMessageApi, sendMessageApi } from "@/features/messages/fetchers/message-fetchers"

import { planSends, runSend, type ForwardJob } from "../store/forward-sends"
import type { DestinationSend, ForwardApi } from "../types"

const api: ForwardApi = {
  sendComment: (channelId, body, clientMsgId) => sendMessageApi(channelId, body, clientMsgId),
  forward: forwardMessageApi,
}

/**
 * Forwards one message. `start` sends to every destination at once; `retry` sends again only
 * what a failed destination still misses. Null `sends` until started.
 */
export function useForward(messageId: string) {
  const [sends, setSends] = useState<Record<string, DestinationSend> | null>(null)
  const jobRef = useRef<ForwardJob>({ messageId, comment: "" })

  const run = useCallback(async (send: DestinationSend) => {
    const update = (next: DestinationSend) =>
      setSends((current) => ({ ...current, [next.channelId]: next }))
    update({ ...send, status: "sending", failure: undefined })
    update(await runSend(send, jobRef.current, api))
  }, [])

  const start = useCallback(
    (channelIds: string[], comment: string) => {
      jobRef.current = { messageId, comment: comment.trim() }
      const planned = planSends(channelIds, jobRef.current.comment)
      setSends(planned)
      return Promise.all(Object.values(planned).map(run)).then(() => undefined)
    },
    [messageId, run],
  )

  const retry = useCallback(
    (channelId: string) => {
      const send = sends?.[channelId]
      if (send?.status === "failed") void run(send)
    },
    [sends, run],
  )

  return { sends, start, retry }
}
