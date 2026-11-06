// Who is typing, per channel. `typing` messages are never stored and have no "stopped" message:
// each one keeps its user for 5 s.
// Contract: chatty-infra/docs/events.md#ws-typing-out.

/** How long a `typing` message keeps its user on screen. */
export const TYPING_HIDE_MS = 5_000

/**
 * How often to send `typing`. The server drops what comes within 3 s of the last one, so this
 * stays a little above: a dropped message would leave a 6 s gap and hide a user who is typing.
 */
export const TYPING_SEND_EVERY_MS = 3_200

/** channel_id → user_id → when that user stops being shown (ms). */
export type TypingState = Readonly<Record<string, Readonly<Record<string, number>>>>

/** A `typing` message: adds the user, or restarts their time. */
export function addTyping(
  state: TypingState,
  channelId: string,
  userId: string,
  now: number,
): TypingState {
  return { ...state, [channelId]: { ...state[channelId], [userId]: now + TYPING_HIDE_MS } }
}

/** The user's message arrived, so they stopped typing. Same state back when they weren't shown. */
export function removeTyping(state: TypingState, channelId: string, userId: string): TypingState {
  const users = state[channelId]
  if (users?.[userId] === undefined) return state
  const rest = without(users, userId)
  return Object.keys(rest).length > 0 ? { ...state, [channelId]: rest } : without(state, channelId)
}

/** Removes everyone whose time is up. Same state back when nobody's is. */
export function removeExpired(state: TypingState, now: number): TypingState {
  let next = state
  for (const [channelId, users] of Object.entries(state)) {
    for (const [userId, hideAt] of Object.entries(users)) {
      if (hideAt <= now) next = removeTyping(next, channelId, userId)
    }
  }
  return next
}

/** When the next user is due to go, or null when nobody is typing. */
export function nextHideAt(state: TypingState): number | null {
  const times = Object.values(state).flatMap((users) => Object.values(users))
  return times.length > 0 ? Math.min(...times) : null
}

/** The users typing in a channel, first one first. */
export function typingIn(state: TypingState, channelId: string): string[] {
  return Object.keys(state[channelId] ?? {})
}

/** True when enough time has passed since the last `typing` sent to this channel. */
export function canSendTyping(lastSentAt: number | undefined, now: number): boolean {
  return lastSentAt === undefined || now - lastSentAt >= TYPING_SEND_EVERY_MS
}

/** The line above the composer. A name that hasn't loaded yet is undefined. */
export function typingLabel(names: (string | undefined)[]): string {
  if (names.length === 0) return ""
  if (names.length > 2) return "Several people are typing…"
  const [first, second] = names
  if (names.some((name) => name === undefined)) return "Someone is typing…"
  return names.length === 1 ? `${first} is typing…` : `${first} and ${second} are typing…`
}

function without<T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> {
  const copy = { ...record }
  delete copy[key]
  return copy
}
