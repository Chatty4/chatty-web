// The login session: the token pair from chatty-core and its rotation (api-core.md, Authorization).
//
// - Both tokens are shared by the tabs, so they live in localStorage: the refresh token (30 days,
//   rotated on every refresh) and the latest access token (a JWT, 15 minutes). A reload or a new
//   tab uses the stored access token instead of rotating the refresh token again.
// - Sending a rotated refresh token again logs out every device, so the tokens are only read and
//   replaced inside a Web Lock: tabs refresh one at a time, and a tab that waited finds the token
//   the previous one stored and uses it.
// - A tab that refreshes, logs in or logs out tells the other tabs (BroadcastChannel).
// - Every login gets a session id. A tab whose login was replaced by another one (maybe another
//   user) reloads instead of using the new token with the old user's data (lib/session-sync.ts).
// - The access token is refreshed about a minute before it expires, and again when a request
//   gets 401 (lib/api.ts).

import { ApiError, networkError, readJson, toApiError } from "@/lib/api-error"
import { CORE_API_URL } from "@/lib/config"
import { sharedTokenAction } from "@/lib/session-sync"

/** POST /auth/login and POST /auth/refresh return these fields (and more). */
export type TokenPair = {
  access_token: string
  refresh_token: string
  expires_in: number
}

export type SessionEvent = "logged-in" | "logged-out"

type AccessToken = { token: string; expiresAt: number }

type Message =
  | { type: "logged-in" | "refreshed"; token: string; expiresAt: number; sessionId: string }
  | { type: "logged-out" }

const REFRESH_TOKEN_KEY = "refresh_token"
/** Changes with every login, so a stored access token from an earlier login is never used. */
const SESSION_ID_KEY = "session_id"
const ACCESS_TOKEN_KEY = "access_token"
const LOCK_NAME = "chatty:refresh-token"
/** Refresh this long before the access token expires. */
const REFRESH_MARGIN_MS = 60_000

let access: AccessToken | null = readSharedAccess()
/** The login this tab is in: the stored one when it loads, a new one after a login here. */
let mySessionId: string | null = readLocal(SESSION_ID_KEY)
let refreshTimer: ReturnType<typeof setTimeout> | undefined
let inFlight: Promise<string> | null = null
const listeners = new Set<(event: SessionEvent) => void>()
const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("chatty-auth")

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string | null): void {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    // storage blocked: the session lasts until this tab closes
  }
}

function readRefreshToken(): string | null {
  return readLocal(REFRESH_TOKEN_KEY)
}

function writeRefreshToken(token: string | null): void {
  writeLocal(REFRESH_TOKEN_KEY, token)
}

/** The access token another tab (or this one, before a reload) stored for the current login. */
function readSharedAccess(): AccessToken | null {
  const sessionId = readLocal(SESSION_ID_KEY)
  if (!sessionId || !readRefreshToken()) return null
  try {
    const cached: unknown = JSON.parse(localStorage.getItem(ACCESS_TOKEN_KEY) ?? "null")
    if (
      typeof cached === "object" &&
      cached !== null &&
      "sessionId" in cached &&
      cached.sessionId === sessionId &&
      "token" in cached &&
      typeof cached.token === "string" &&
      "expiresAt" in cached &&
      typeof cached.expiresAt === "number" &&
      cached.expiresAt > Date.now()
    ) {
      return { token: cached.token, expiresAt: cached.expiresAt }
    }
  } catch {
    // storage blocked or a broken value: refresh instead
  }
  return null
}

function writeSharedAccess(token: AccessToken | null): void {
  const sessionId = readLocal(SESSION_ID_KEY)
  writeLocal(ACCESS_TOKEN_KEY, token && sessionId ? JSON.stringify({ ...token, sessionId }) : null)
}

function emit(event: SessionEvent): void {
  listeners.forEach((listener) => listener(event))
}

function isFresh(token: AccessToken | null): token is AccessToken {
  return token !== null && token.expiresAt - Date.now() > REFRESH_MARGIN_MS
}

function scheduleRefresh(): void {
  clearTimeout(refreshTimer)
  if (!access) return
  const delay = Math.max(0, access.expiresAt - REFRESH_MARGIN_MS - Date.now())
  refreshTimer = setTimeout(() => {
    // A failure is handled by the next request's 401, or ends the session (401/403).
    refreshSession(access?.token ?? null).catch(() => {})
  }, delay)
}

/** Use this access token in this tab (from a response, another tab or storage). */
function adoptAccess(token: AccessToken): AccessToken {
  access = token
  scheduleRefresh()
  return token
}

/** Store a new pair for every tab. expires_in counts from now, so a wrong clock doesn't matter. */
function storePair(pair: TokenPair): AccessToken {
  const token = { token: pair.access_token, expiresAt: Date.now() + pair.expires_in * 1000 }
  writeRefreshToken(pair.refresh_token)
  writeSharedAccess(token)
  return adoptAccess(token)
}

/** Run fn while no other tab of this origin rotates the refresh token. */
export function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  // Web Locks need a secure context (https or localhost); without them only this tab is guarded.
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(LOCK_NAME, fn)
  }
  return fn()
}

function isMessage(data: unknown): data is Message {
  if (typeof data !== "object" || data === null || !("type" in data)) return false
  if (data.type === "logged-out") return true
  return (
    (data.type === "logged-in" || data.type === "refreshed") &&
    "token" in data &&
    typeof data.token === "string" &&
    "expiresAt" in data &&
    typeof data.expiresAt === "number" &&
    "sessionId" in data &&
    typeof data.sessionId === "string"
  )
}

channel?.addEventListener("message", (event: MessageEvent<unknown>) => {
  const message = event.data
  if (!isMessage(message)) return
  if (message.type === "logged-out") {
    endSession({ broadcast: false })
  } else if (message.type === "logged-in" || message.type === "refreshed") {
    if (sharedTokenAction(mySessionId, message.sessionId) === "reload") {
      // Another login took over the shared storage; the reload starts this tab from it.
      window.location.reload()
      return
    }
    const wasLoggedIn = access !== null
    mySessionId = message.sessionId
    adoptAccess({ token: message.token, expiresAt: message.expiresAt })
    if (!wasLoggedIn) emit("logged-in")
  }
})

// A stored access token (from before a reload, or another tab) still needs its refresh timer.
scheduleRefresh()

export function getAccessToken(): string | null {
  return access?.token ?? null
}

/** When the access token expires, on this device's clock. Null without one. */
export function getAccessExpiry(): number | null {
  return access?.expiresAt ?? null
}

export function getRefreshToken(): string | null {
  return readRefreshToken()
}

/** True when this browser holds a refresh token, so the session can be restored. */
export function hasStoredSession(): boolean {
  return readRefreshToken() !== null
}

export function subscribeSession(listener: (event: SessionEvent) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** A random id. crypto.randomUUID() needs a secure context; getRandomValues() works everywhere. */
function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/** After a login: keep the pair and tell the other tabs. */
export function startSession(pair: TokenPair): void {
  const sessionId = randomId()
  mySessionId = sessionId
  writeLocal(SESSION_ID_KEY, sessionId)
  const token = storePair(pair)
  channel?.postMessage({ type: "logged-in", ...token, sessionId } satisfies Message)
  emit("logged-in")
}

/** Forget the tokens, here and (by default) in every other tab. */
export function endSession({ broadcast = true }: { broadcast?: boolean } = {}): void {
  const wasLoggedIn = access !== null || readRefreshToken() !== null
  clearTimeout(refreshTimer)
  access = null
  mySessionId = null
  if (broadcast) {
    writeRefreshToken(null)
    writeSharedAccess(null)
    writeLocal(SESSION_ID_KEY, null)
    channel?.postMessage({ type: "logged-out" } satisfies Message)
  }
  if (wasLoggedIn) emit("logged-out")
}

/**
 * A valid access token, rotating the refresh token if needed. `stale` is the access token that
 * was rejected or is about to expire: if another tab already replaced it, that token is used and
 * nothing is rotated. Ends the session when chatty-core rejects the refresh token (401) or the
 * user was deactivated (403); keeps it on network and server errors.
 */
export function refreshSession(stale: string | null): Promise<string> {
  inFlight ??= withRefreshLock(async () => {
    // Another tab logged in as someone else, and this tab missed its broadcast: the stored
    // tokens aren't this tab's login any more. Not a rejected session (that would end the
    // new login too), so it fails like a network error while the page reloads.
    const stored = readLocal(SESSION_ID_KEY)
    if (stored !== null && sharedTokenAction(mySessionId, stored) === "reload") {
      window.location.reload()
      throw new ApiError(0, "session_changed", "Another tab logged in")
    }

    // Another tab may have refreshed while this one waited for the lock.
    const shared = readSharedAccess()
    if (isFresh(shared) && shared.token !== stale) return adoptAccess(shared).token
    if (isFresh(access) && access.token !== stale) return access.token

    const refreshToken = readRefreshToken()
    if (!refreshToken) {
      endSession({ broadcast: false })
      throw new ApiError(401, "invalid_refresh_token", "Not logged in")
    }

    let response: Response
    try {
      response = await fetch(`${CORE_API_URL}/auth/refresh`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch {
      throw networkError()
    }

    const body = await readJson(response)
    if (!response.ok) {
      const error = toApiError(response, body)
      // A dead token must not be sent again: a waiting tab would replay it and wipe every
      // session, including a new login made in the meantime.
      if (response.status === 401 || response.status === 403) endSession()
      throw error
    }

    const token = storePair(body as TokenPair)
    // Without a login id (storage blocked) the other tabs can't check it: don't share it.
    if (mySessionId !== null) {
      channel?.postMessage({ type: "refreshed", ...token, sessionId: mySessionId } satisfies Message)
    }
    return token.token
  }).finally(() => {
    inFlight = null
  })
  return inFlight
}

/** An access token that is valid for at least another minute. */
export async function freshAccessToken(): Promise<string> {
  const current = access
  return isFresh(current) ? current.token : refreshSession(getAccessToken())
}
