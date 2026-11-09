// What a tab does with a token another tab shares (lib/session.ts). Each login gets a new
// session id, and every shared token says which login it belongs to.

export type SharedTokenAction =
  /** Use the token: it is this tab's login, or this tab has no login yet. */
  | "adopt"
  /**
   * Reload the page: another tab logged in as someone else, maybe another user. This tab
   * still shows the old user's data, and its requests would now go out with the new token.
   */
  | "reload"

/**
 * `mine` is the login this tab is in (null when logged out), `theirs` the login of the token
 * another tab shared.
 */
export function sharedTokenAction(mine: string | null, theirs: string): SharedTokenAction {
  return mine === null || mine === theirs ? "adopt" : "reload"
}
