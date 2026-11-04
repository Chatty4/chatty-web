import type { BrowsableChannel, SidebarChannel } from "../types"

export type BrowseEntry = {
  id: string
  name: string
  topic: string | null
  kind: "public" | "private"
  archived: boolean
  /** Null for joined channels: the sidebar list has no member count. */
  memberCount: number | null
  joined: boolean
  isDefault: boolean
}

export function memberCountLabel(count: number): string {
  return `${count} member${count === 1 ? "" : "s"}`
}

/**
 * One A–Z list for the browse page. GET /channels/browse only returns public channels
 * I haven't joined, so the ones I'm in come from the sidebar and are matched here.
 * A channel in both (just joined, list not refreshed yet) counts as joined.
 */
export function mergeBrowseEntries(
  unjoined: BrowsableChannel[],
  joined: SidebarChannel[],
  query: string,
): BrowseEntry[] {
  const needle = query.trim().toLowerCase()
  const entries = new Map<string, BrowseEntry>()

  for (const channel of unjoined) {
    entries.set(channel.id, {
      id: channel.id,
      name: channel.name,
      topic: channel.topic,
      kind: "public",
      archived: channel.archived,
      memberCount: channel.member_count,
      joined: false,
      isDefault: false,
    })
  }

  for (const channel of joined) {
    if (channel.kind === "dm" || channel.name === null) continue
    if (!channel.name.toLowerCase().includes(needle)) continue
    entries.set(channel.id, {
      id: channel.id,
      name: channel.name,
      topic: channel.topic,
      kind: channel.kind,
      archived: channel.archived,
      memberCount: null,
      joined: true,
      isDefault: channel.is_default,
    })
  }

  return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name))
}
