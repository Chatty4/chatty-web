/**
 * Where to go after logging in: the page the user came from, if it is a path in this app.
 * Anything else (another origin, "//evil.example", a missing value) goes home, so the redirect
 * can't be used to send someone to another site.
 */
export function safeRedirectPath(value: unknown): string {
  if (typeof value !== "string") return "/"
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/"
  return value
}

/** The location state that RequireAuth passes to the login page. */
export type RedirectState = { from?: string } | null
