import { coreApi } from "@/lib/api"
import { endSession, freshAccessToken, getRefreshToken, withRefreshLock } from "@/lib/session"

import type { LoginInput, LoginResponse, Me, RegisterInput, User } from "../types"

/** POST /auth/login. Doesn't store anything: the caller starts the session. */
export function loginRequest(input: LoginInput): Promise<LoginResponse> {
  return coreApi.post<LoginResponse>("/auth/login", input, { auth: false })
}

/** POST /auth/register. Doesn't log in (api-core.md). */
export function registerRequest(input: RegisterInput): Promise<User> {
  return coreApi.post<User>("/auth/register", input, { auth: false })
}

/** GET /me */
export function meRequest(signal?: AbortSignal): Promise<Me> {
  return coreApi.get<Me>("/me", { signal })
}

/**
 * POST /auth/logout for this device, then forget the tokens in every tab. The tokens are
 * forgotten even when the request fails: the user asked to log out.
 */
export async function logoutRequest(): Promise<void> {
  try {
    await freshAccessToken()
    // In the lock, so no other tab rotates the refresh token between reading and revoking it.
    await withRefreshLock(async () => {
      const refreshToken = getRefreshToken()
      if (!refreshToken) return
      await coreApi.post("/auth/logout", { refresh_token: refreshToken }, { refreshOnExpiry: false })
    })
  } catch {
    // offline, or the session had already ended: nothing left to revoke from here
  } finally {
    endSession()
  }
}
