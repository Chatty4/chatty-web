// When the open channel needs a WebSocket `watch` (chatty-infra/docs/events.md, ws-watch).

export type WatchInputs = {
  /** The channel is in my sidebar: its events reach my socket without a watch. */
  isMember: boolean
  /** The sidebar has loaded for this team. Until then "not in the sidebar" means nothing. */
  sidebarLoaded: boolean
  /** The history loaded, so I can read the channel. A private channel I'm not in fails here. */
  historyLoaded: boolean
}

/**
 * True for a channel I can read but haven't joined: a public channel of my team, opened from
 * Browse or a link. Without a watch it gets no live events (new messages, edits, reactions).
 */
export function shouldWatch({ isMember, sidebarLoaded, historyLoaded }: WatchInputs): boolean {
  return !isMember && sidebarLoaded && historyLoaded
}
