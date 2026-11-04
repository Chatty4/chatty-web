import { ApiError } from "@/lib/api-error"

/** User-facing text for POST /auth/password errors (api-core.md). */
export function describePasswordError(error: unknown): string {
  const code = error instanceof ApiError ? error.code : undefined
  switch (code) {
    case "wrong_password":
      return "Current password is incorrect."
    case "rate_limited":
      return "Too many tries. Wait a while and try again."
    default:
      return "Could not change password. Make sure it is at least 10 characters and not a common one."
  }
}
