// The "N new" count on the jump-to-latest pill in the message list.

type KeyedMessage = { id: string; client_msg_id?: string; author_id: string }

/**
 * Stable across the pending copy and the saved one: the server echoes `client_msg_id`
 * on the POST answer and on `message.created`.
 */
export function messageKey(message: KeyedMessage): string {
  return message.client_msg_id ?? message.id
}

/**
 * How many messages from others arrived after `previousKey`, the newest message the
 * list had before. Counted by position, not by how much the list grew: an older page
 * loaded at the top meanwhile must not count as new. When `previousKey` isn't in the
 * list any more (the channel was reloaded), counts the newest message only.
 */
export function countNewMessages(
  messages: KeyedMessage[],
  previousKey: string,
  myUserId: string | undefined,
): number {
  const previousIndex = messages.findIndex((m) => messageKey(m) === previousKey)
  if (previousIndex === -1) return 1
  return messages.slice(previousIndex + 1).filter((m) => m.author_id !== myUserId).length
}
