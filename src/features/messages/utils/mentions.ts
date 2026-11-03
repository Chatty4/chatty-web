// Mentions are stored in message bodies as `<@user_id>` (chatty-infra/docs/api-chat.md#message-object).
// The composer and editor work with readable `@Display Name` text and convert at the edges.

export type MentionCandidate = { id: string; display_name: string }

export type MessagePart = { type: "text"; value: string } | { type: "mention"; userId: string }

const TOKEN = /<@([0-9a-fA-F-]{36})>/g

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** User ids mentioned in a stored body, in order, without duplicates. */
export function extractMentionIds(body: string): string[] {
  return [...new Set(Array.from(body.matchAll(TOKEN), (m) => m[1]!))]
}

/** Splits a stored body into text and mention parts for rendering. */
export function splitMentions(body: string): MessagePart[] {
  const parts: MessagePart[] = []
  let last = 0
  for (const match of body.matchAll(TOKEN)) {
    const start = match.index
    if (start > last) parts.push({ type: "text", value: body.slice(last, start) })
    parts.push({ type: "mention", userId: match[1]! })
    last = start + match[0].length
  }
  if (last < body.length) parts.push({ type: "text", value: body.slice(last) })
  return parts
}

/**
 * Turns `<@id>` into `@Display Name` for editing.
 * Unknown ids keep their token so saving the edit does not drop the mention.
 */
export function decodeMentions(body: string, names: Record<string, string>): string {
  return body.replace(TOKEN, (token, id: string) => (names[id] ? `@${names[id]}` : token))
}

/**
 * Turns `@Display Name` into `<@id>` for every candidate written in the text.
 * Longest names match first so "@Ana Maria" is not read as "@Ana".
 */
export function encodeMentions(text: string, candidates: MentionCandidate[]): string {
  const byName = new Map<string, string>()
  for (const c of candidates) {
    const key = c.display_name.toLowerCase()
    if (c.display_name.trim() && !byName.has(key)) byName.set(key, c.id)
  }
  if (byName.size === 0) return text

  const names = [...byName.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp)
  const pattern = new RegExp(`@(${names.join("|")})(?![\\w])`, "gi")
  return text.replace(pattern, (match, name: string) => {
    const id = byName.get(name.toLowerCase())
    return id ? `<@${id}>` : match
  })
}
