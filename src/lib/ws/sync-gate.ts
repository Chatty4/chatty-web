// Holds live messages back while a sync runs, then releases them in order
// (chatty-infra/docs/events.md "After a reconnect", steps 1–3).

export type SyncGate<T> = {
  /** Delivers the message, or holds it while a sync is running. */
  receive: (message: T) => void
  /**
   * Runs a sync with the gate closed. A failed sync still releases held messages, so
   * they are never stuck. If a newer sync starts meanwhile (the socket dropped again),
   * only that one opens the gate.
   */
  run: (sync: () => Promise<void>) => Promise<void>
}

export function createSyncGate<T>(deliver: (message: T) => void): SyncGate<T> {
  let latestRun = 0
  let closed = false
  let held: T[] = []

  return {
    receive(message) {
      if (closed) held.push(message)
      else deliver(message)
    },

    async run(sync) {
      const thisRun = ++latestRun
      closed = true
      try {
        await sync()
      } catch {
        // The sequencer's gap detection catches up from the next event.
      }
      if (thisRun !== latestRun) return
      closed = false
      const released = held
      held = []
      released.forEach(deliver)
    },
  }
}
