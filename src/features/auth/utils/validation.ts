// Client-side checks with the same limits as chatty-core (api-core.md, POST /auth/register).
// They only save a round trip: the server checks everything again (common and similar
// passwords only there).

import type { FieldErrors, LoginInput, RegisterInput } from "../types"

export const PASSWORD_MIN_LENGTH = 10
const DISPLAY_NAME_MAX_LENGTH = 60
const EMAIL_MAX_LENGTH = 254
// Something@something.something, no spaces. The server decides what is really valid.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function emailError(email: string): string | undefined {
  if (!email.trim()) return "Enter your email address."
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email.trim())) {
    return "Enter a valid email address."
  }
}

export function validateLogin(input: LoginInput): FieldErrors<keyof LoginInput> {
  const errors: FieldErrors<keyof LoginInput> = {}
  const email = emailError(input.email)
  if (email) errors.email = email
  if (!input.password) errors.password = "Enter your password."
  return errors
}

export function validateRegister(input: RegisterInput): FieldErrors<keyof RegisterInput> {
  const errors: FieldErrors<keyof RegisterInput> = {}

  const name = input.display_name.trim()
  if (!name) errors.display_name = "Enter your name."
  else if (name.length > DISPLAY_NAME_MAX_LENGTH) {
    errors.display_name = `Use at most ${DISPLAY_NAME_MAX_LENGTH} characters.`
  }

  const email = emailError(input.email)
  if (email) errors.email = email

  if (input.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  } else if (/^\d+$/.test(input.password)) {
    errors.password = "Use letters or symbols too, not only numbers."
  }
  return errors
}
