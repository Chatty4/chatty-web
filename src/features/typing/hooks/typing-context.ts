import { createContext, useContext } from "react"

export type TypingContextValue = {
  /** The users typing in a channel, first one first. */
  typingIn: (channelId: string) => string[]
}

export const TypingContext = createContext<TypingContextValue | null>(null)

export function useTyping(): TypingContextValue {
  const value = useContext(TypingContext)
  if (!value) throw new Error("useTyping must be used inside TypingProvider")
  return value
}
