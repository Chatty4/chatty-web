// Tells whoever shows a channel's members that I just changed them here, from the Members tab.
// Other people's changes have no WebSocket message; this only covers mine.

type Listener = (channelId: string) => void

const listeners = new Set<Listener>()

/** Call after adding or removing members of a channel. */
export function notifyMembersChanged(channelId: string): void {
  listeners.forEach((listener) => listener(channelId))
}

/** Returns the unsubscribe function. */
export function subscribeMembersChanged(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
