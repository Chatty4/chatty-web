import { dmDisplayName, type SidebarChannel } from "@/features/channels"

import { MAX_FORWARD_DESTINATIONS } from "../constants"
import type { Destination } from "../types"

/**
 * Where a message can be forwarded: the team's channels I'm in and my open DMs, in sidebar
 * order. Archived channels are read-only, so they are left out.
 */
export function forwardDestinations(
  channels: SidebarChannel[],
  dms: SidebarChannel[],
  myUserId: string,
  memberNames: Record<string, string>,
): Destination[] {
  return [
    ...channels
      .filter((channel) => !channel.archived)
      .map((channel) => ({ id: channel.id, kind: channel.kind, name: channel.name ?? "" })),
    ...dms
      .filter((dm) => !dm.archived)
      .map((dm) => ({
        id: dm.id,
        kind: dm.kind,
        name: dmDisplayName(dm.dm_member_ids ?? [], myUserId, memberNames),
      })),
  ]
}

/** The destinations whose name contains the query, ignoring case and spaces around it. */
export function filterDestinations(destinations: Destination[], query: string): Destination[] {
  const q = query.trim().toLocaleLowerCase()
  if (!q) return destinations
  return destinations.filter((destination) => destination.name.toLocaleLowerCase().includes(q))
}

/** Picks or unpicks a destination. Past the limit a new one isn't added. */
export function toggleDestination(selected: string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter((picked) => picked !== id)
  if (selected.length >= MAX_FORWARD_DESTINATIONS) return selected
  return [...selected, id]
}
