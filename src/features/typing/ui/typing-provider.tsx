// Who is typing in each channel, from the `typing` messages. A user goes when their 5 s are up
// or when their message arrives. Nothing to load after a reconnect: typing is never stored.
//
// Contract: chatty-infra/docs/events.md#ws-typing-out.

import { useCallback, useEffect, useState, type ReactNode } from "react"

import type { ApiMessage } from "@/features/messages"
import { useWs } from "@/features/ws"

import { TypingContext } from "../hooks/typing-context"
import {
  addTyping,
  nextHideAt,
  removeExpired,
  removeTyping,
  typingIn as usersTypingIn,
  type TypingState,
} from "../store/typing"

type MessageCreatedPayload = { message: Pick<ApiMessage, "author_id"> }

export function TypingProvider({ children }: { children: ReactNode }) {
  const { subscribe } = useWs()
  const [state, setState] = useState<TypingState>({})

  useEffect(
    () =>
      subscribe((message) => {
        if (message.type === "typing") {
          const now = Date.now()
          setState((current) => addTyping(current, message.channel_id, message.user_id, now))
        } else if (message.type === "event" && message.event.type === "message.created") {
          const { channel_id, payload } = message.event
          const { author_id } = (payload as MessageCreatedPayload).message
          setState((current) => removeTyping(current, channel_id, author_id))
        }
      }),
    [subscribe],
  )

  // One timer, for whoever goes next.
  useEffect(() => {
    const hideAt = nextHideAt(state)
    if (hideAt === null) return
    const timer = setTimeout(
      () => setState((current) => removeExpired(current, Date.now())),
      hideAt - Date.now(),
    )
    return () => clearTimeout(timer)
  }, [state])

  const typingIn = useCallback(
    (channelId: string) => usersTypingIn(state, channelId),
    [state],
  )

  return <TypingContext.Provider value={{ typingIn }}>{children}</TypingContext.Provider>
}
