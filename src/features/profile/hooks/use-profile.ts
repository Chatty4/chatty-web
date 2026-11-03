import { useCallback } from "react"

import { useAuth } from "@/features/auth"

import { changePasswordRequest, updateMeRequest } from "../fetchers/profile-fetchers"
import type { ChangePasswordInput, UpdateMeInput } from "../types"

/** Profile mutations for the authenticated user. */
export function useProfile() {
  const { user, updateUser } = useAuth()

  const updateProfile = useCallback(
    async (input: Omit<UpdateMeInput, "avatar_file_id">) => {
      if (!user) throw new Error("Not authenticated")
      const me = await updateMeRequest({ ...input, avatar_file_id: user.avatar_file_id })
      updateUser(me)
    },
    [user, updateUser],
  )

  const changePassword = useCallback(async (input: ChangePasswordInput) => {
    await changePasswordRequest(input)
  }, [])

  return { user, updateProfile, changePassword }
}
