// Turns chatty-core's auth errors into text for the forms (api-core.md: Errors, Field reasons).

import { ApiError, isServerUnavailable } from "@/lib/api"

import { PASSWORD_MIN_LENGTH } from "./validation"

/** Field reasons from the contract. An unknown reason is treated as `invalid`. */
const FIELD_REASONS: Record<string, string> = {
  required: "This field is required.",
  null: "This field is required.",
  blank: "This field is required.",
  invalid: "This value isn't valid.",
  too_long: "This is too long.",
  too_short: "This is too short.",
  password_too_short: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
  password_too_common: "This password is too common. Choose a less predictable one.",
  password_entirely_numeric: "Use letters or symbols too, not only numbers.",
  password_too_similar: "This password is too similar to your email or name.",
}

const FIELD_OVERRIDES: Record<string, Record<string, string>> = {
  email: { invalid: "Enter a valid email address." },
}

function fieldMessage(field: string, reason: string): string {
  return FIELD_OVERRIDES[field]?.[reason] ?? FIELD_REASONS[reason] ?? FIELD_REASONS.invalid
}

function waitText(seconds: number | undefined): string {
  if (!seconds) return "a few minutes"
  if (seconds < 60) return `${seconds} seconds`
  const minutes = Math.ceil(seconds / 60)
  return minutes === 1 ? "a minute" : `${minutes} minutes`
}

/** Register worked but the login right after it didn't (rate limit, network): log in by hand. */
export class AccountCreatedError extends Error {
  constructor(cause: unknown) {
    super("The account was created, but logging in failed", { cause })
    this.name = "AccountCreatedError"
  }
}

export type FormError = {
  /** One message per form field the server rejected. */
  fields: Record<string, string>
  /** A message for the whole form, if the error isn't about one field. */
  form?: string
}

/** The messages to show for a failed login, register or refresh. */
export function describeAuthError(error: unknown, knownFields: readonly string[]): FormError {
  if (isServerUnavailable(error) || !(error instanceof ApiError)) {
    return { fields: {}, form: "Chatty can't be reached right now. Check your connection and try again." }
  }

  switch (error.code) {
    case "invalid_credentials":
      return { fields: {}, form: "The email or password is incorrect." }
    case "user_inactive":
      return { fields: {}, form: "This account has been deactivated." }
    case "email_taken":
      return { fields: { email: "An account with this email already exists." } }
    case "too_many_attempts":
    case "rate_limited":
      return { fields: {}, form: `Too many attempts. Try again in ${waitText(error.retryAfter)}.` }
    case "validation_error": {
      const fields: Record<string, string> = {}
      for (const [field, reason] of Object.entries(error.fields)) {
        if (knownFields.includes(field)) fields[field] = fieldMessage(field, reason)
      }
      // A rejected field this form doesn't show still needs a message somewhere.
      const unshown = Object.keys(error.fields).some((field) => !knownFields.includes(field))
      return { fields, form: unshown ? "Some details weren't accepted. Check them and try again." : undefined }
    }
    default:
      return { fields: {}, form: "Something went wrong. Try again." }
  }
}
