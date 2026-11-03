import { coreApi } from "@/lib/api"
import { getRefreshToken } from "@/lib/session"

import type { Me } from "@/features/auth/types"

import type { ChangePasswordInput, UpdateMeInput } from "../types"

/** PUT /me — update display name, timezone, and avatar. Returns the full Me object. */
export function updateMeRequest(input: UpdateMeInput): Promise<Me> {
  return coreApi.put<Me>("/me", input)
}

/**
 * POST /auth/password — change password.
 * Reads the current refresh token from the session (required by the API to keep this device logged in).
 */
export async function changePasswordRequest(input: ChangePasswordInput): Promise<void> {
  const refresh_token = getRefreshToken()
  if (!refresh_token) throw new Error("No active session")
  await coreApi.post("/auth/password", {
    old_password: input.old_password,
    new_password: input.new_password,
    refresh_token,
  })
}
