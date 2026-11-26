import { createContext, useContext } from "react"

import type { Positions } from "../store/reads"

export type ReadsContextValue = {
  /** Starts loading and following a channel's reads. Returns the function that stops it. */
  track: (channelId: string) => () => void
  /** The channel's read positions once GET /reads answered; null before or after a failure. */
  positionsOf: (channelId: string) => Positions | null
}

export const ReadsContext = createContext<ReadsContextValue | null>(null)

export function useReads(): ReadsContextValue {
  const value = useContext(ReadsContext)
  if (!value) throw new Error("useReads must be used inside ReadsProvider")
  return value
}
