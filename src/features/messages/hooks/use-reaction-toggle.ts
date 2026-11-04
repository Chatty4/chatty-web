import { useState } from "react"

import { toast } from "@/lib/toast"

import { describeReactionError, messageErrorCode } from "../utils/errors"

type UseReactionToggleOptions = {
  /** Rejects with ApiError on failure. */
  setReaction: (emoji: string, on: boolean) => Promise<void>
  onChannelArchived: () => void
}

/** Sends one reaction change at a time per emoji, and reports failures. */
export function useReactionToggle({ setReaction, onChannelArchived }: UseReactionToggleOptions) {
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set())

  const change = async (emoji: string, on: boolean) => {
    if (busy.has(emoji)) return
    setBusy((current) => new Set(current).add(emoji))
    try {
      await setReaction(emoji, on)
    } catch (error) {
      toast.error(describeReactionError(error))
      if (messageErrorCode(error) === "channel_archived") onChannelArchived()
    } finally {
      setBusy((current) => {
        const next = new Set(current)
        next.delete(emoji)
        return next
      })
    }
  }

  return { busy, change }
}
