import { useState } from "react"

import { toast } from "@/lib/toast"

import { describePinError, messageErrorCode } from "../utils/errors"

type UsePinToggleOptions = {
  /** Rejects with ApiError on failure. */
  setPinned: (messageId: string, on: boolean) => Promise<void>
  onChannelArchived: () => void
}

/** Pins or unpins one message at a time, and reports the result. */
export function usePinToggle({ setPinned, onChannelArchived }: UsePinToggleOptions) {
  const [busyId, setBusyId] = useState<string>()

  const toggle = async (messageId: string, on: boolean) => {
    if (busyId) return
    setBusyId(messageId)
    try {
      await setPinned(messageId, on)
      toast.success(on ? "Message pinned" : "Message unpinned")
    } catch (error) {
      toast.error(describePinError(error))
      if (messageErrorCode(error) === "channel_archived") onChannelArchived()
    } finally {
      setBusyId(undefined)
    }
  }

  return { busyId, toggle }
}
