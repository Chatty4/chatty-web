// The wait a 429 asks for (Retry-After, in seconds), as text for the user.

/** "12 seconds", "a minute", "3 minutes"; "a few minutes" when the server didn't say. */
export function waitText(seconds: number | undefined): string {
  if (!seconds) return "a few minutes"
  if (seconds < 60) return seconds === 1 ? "1 second" : `${seconds} seconds`
  const minutes = Math.ceil(seconds / 60)
  return minutes === 1 ? "a minute" : `${minutes} minutes`
}
