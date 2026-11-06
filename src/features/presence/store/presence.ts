import type { PresenceMessage } from "@/lib/ws/types"

/** A `presence` message: adds or removes one user. Same set back when nothing changed. */
export function applyPresence(
  online: ReadonlySet<string>,
  message: PresenceMessage,
): ReadonlySet<string> {
  const isOnline = message.status === "online"
  if (online.has(message.user_id) === isOnline) return online
  const next = new Set(online)
  if (isOnline) next.add(message.user_id)
  else next.delete(message.user_id)
  return next
}

/** The GET answer, with the messages that arrived while it was on its way applied on top. */
export function mergeAnswer(
  answer: string[],
  arrivedMeanwhile: PresenceMessage[],
): ReadonlySet<string> {
  return arrivedMeanwhile.reduce(applyPresence, new Set(answer) as ReadonlySet<string>)
}
