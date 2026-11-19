import type { SidebarChannel } from "../types"

/**
 * DMs with the newest message first. A DM whose last message isn't known (no messages yet, or
 * not loaded) goes after them, in the order chatty-core listed it.
 */
export function sortDmsByActivity(
  dms: SidebarChannel[],
  lastMessageAt: Record<string, string>,
): SidebarChannel[] {
  const time = (dm: SidebarChannel) => {
    const at = lastMessageAt[dm.id]
    return at ? Date.parse(at) : -Infinity
  }
  // Array.prototype.sort is stable, so equal times keep chatty-core's order.
  return [...dms].sort((a, b) => time(b) - time(a))
}

/** Keeps the later of two ISO times, so an older event never moves a DM down. */
export function laterTime(current: string | undefined, next: string): string {
  return current && Date.parse(current) >= Date.parse(next) ? current : next
}
