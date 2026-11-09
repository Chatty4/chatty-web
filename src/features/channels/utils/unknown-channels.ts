// When to reload the sidebar for a channel it doesn't list. Someone else may have added me to
// a channel or opened a DM with me: chatty-chat sends no message for that, only the channel's
// events and unread counts, so an unknown channel id is the signal (events.md: "the sidebar
// updates from chatty-core").

/** An id that is still unknown after a reload is checked again at most this often. */
export const RECHECK_MS = 60_000

export type UnknownChannelTracker = {
  /**
   * True when a message for this channel should reload the sidebar: the sidebar doesn't list
   * it, and it wasn't checked in the last RECHECK_MS. Records the check.
   *
   * Some ids stay unknown on purpose: a public channel I only watch, or a channel of another
   * team. Rechecking them once a minute still notices when I'm added to one of them.
   */
  shouldReload: (channelId: string, known: ReadonlySet<string>) => boolean
  /** Forgets every check, for a team switch. */
  reset: () => void
}

export function createUnknownChannelTracker(now: () => number = Date.now): UnknownChannelTracker {
  const checkedAt = new Map<string, number>()
  return {
    shouldReload(channelId, known) {
      if (known.has(channelId)) return false
      const last = checkedAt.get(channelId)
      const time = now()
      if (last !== undefined && time - last < RECHECK_MS) return false
      checkedAt.set(channelId, time)
      return true
    },
    reset() {
      checkedAt.clear()
    },
  }
}
