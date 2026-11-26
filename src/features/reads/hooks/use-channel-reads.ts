import { useEffect } from "react"

import type { ChannelKind } from "@/features/channels"

import type { Positions } from "../store/reads"
import { hasReadReceipts } from "../store/receipts"
import { useReads } from "./reads-context"

/**
 * The read positions of a private channel or DM while it is on screen, kept live by `read`
 * messages. Null for a public channel, and until GET /reads answered.
 */
export function useChannelReads(
  channelId: string,
  kind: ChannelKind | undefined,
): Positions | null {
  const { track, positionsOf } = useReads()
  const enabled = !!channelId && hasReadReceipts(kind)

  useEffect(() => (enabled ? track(channelId) : undefined), [enabled, channelId, track])

  return enabled ? positionsOf(channelId) : null
}
