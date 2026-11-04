// Mentions are stored in message bodies as `<@user_id>` (chatty-infra/docs/api-chat.md#message-object).
// The composer and editor work with readable `@Display Name` text and convert at the edges.

export type MentionCandidate = { id: string; display_name: string }

export type MessagePart = { type: "text"; value: string } | { type: "mention"; userId: string }

const TOKEN = /<@([0-9a-fA-F-]{36})>/g

/** Fenced or inline code, matched first so a name inside it is skipped. */
const CODE_SPAN = "```[\\s\\S]*?```|`[^`\\n]*`"
const NOT_IN_WORD = "(?<![\\p{L}\\p{N}_.+-])"

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

/** Longest text after the @ still looked up: display names stop at 60 characters. */
const MAX_QUERY_LENGTH = 60

/**
 * The mention being typed at the caret: where its @ is and the text after it, which may
 * hold spaces ("Ana P"). Null when the caret isn't in a mention.
 */
export function findMentionQuery(
  text: string,
  caret: number,
): { start: number; query: string } | null {
  const before = text.slice(0, caret)
  const start = before.lastIndexOf("@")
  if (start === -1) return null
  if (start > 0 && /[\p{L}\p{N}_.+-]/u.test(before[start - 1]!)) return null
  const query = before.slice(start + 1)
  if (query.length > MAX_QUERY_LENGTH || query.includes("\n")) return null
  return { start, query }
}

/**
 * Turns `@Display Name` into `<@id>` for every candidate written in the text.
 * Longest names match first so "@Ana Maria" is not read as "@Ana". An @ inside a word
 * (an email address) and anything in a code span stay as typed.
 *
 * Text alone can't tell two people with the same name apart, so `picks` lists who was
 * chosen, in text order: each @name takes the next pick with that name, then the first
 * candidate with it.
 */
export function encodeMentions(
  text: string,
  candidates: MentionCandidate[],
  picks: MentionCandidate[] = [],
): string {
  const byName = new Map<string, string>()
  for (const c of candidates) {
    const key = c.display_name.toLowerCase()
    if (c.display_name.trim() && !byName.has(key)) byName.set(key, c.id)
  }
  if (byName.size === 0) return text

  const picked = new Map<string, string[]>()
  for (const pick of picks) {
    const key = pick.display_name.toLowerCase()
    picked.set(key, [...(picked.get(key) ?? []), pick.id])
  }

  const names = [...byName.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp)
  const pattern = new RegExp(`${CODE_SPAN}|${NOT_IN_WORD}@(${names.join("|")})(?![\\p{L}\\p{N}_])`, "giu")
  return text.replace(pattern, (match, name: string | undefined) => {
    if (!name) return match
    const key = name.toLowerCase()
    const id = picked.get(key)?.shift() ?? byName.get(key)
    return id ? `<@${id}>` : match
  })
}
