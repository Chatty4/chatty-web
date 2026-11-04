import type { ChannelUpdatedMessage } from "@/lib/ws/types"

import type { SidebarChannel } from "../types"

/** A channel.updated message always has the full values, so they replace what's there. */
export function applyChannelUpdate(
  channels: SidebarChannel[],
  { channel_id, name, topic, archived }: ChannelUpdatedMessage,
): SidebarChannel[] {
  return channels.map((c) => (c.id === channel_id ? { ...c, name, topic, archived } : c))
}
