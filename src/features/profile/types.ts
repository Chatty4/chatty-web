/** Editable fields sent to PUT /me. */
export type UpdateMeInput = {
  display_name: string
  timezone: string
  avatar_file_id: string | null
}

export type ChangePasswordInput = {
  old_password: string
  new_password: string
}
