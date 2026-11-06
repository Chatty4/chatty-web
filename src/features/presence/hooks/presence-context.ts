import { createContext, useContext } from "react"

export type PresenceContextValue = {
  /** True when the user has an open WebSocket. False until the active team's answer arrives. */
  isOnline: (userId: string) => boolean
}

export const PresenceContext = createContext<PresenceContextValue | null>(null)

export function usePresence(): PresenceContextValue {
  const value = useContext(PresenceContext)
  if (!value) throw new Error("usePresence must be used inside PresenceProvider")
  return value
}
