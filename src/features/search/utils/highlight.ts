// The search highlight is HTML: escaped message text with <mark> around the found words.
// It is turned into plain parts here so nothing is ever rendered as HTML.

export type HighlightPart = { text: string; mark: boolean }

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
}

function unescape(html: string): string {
  return html.replace(/&(?:amp|lt|gt|quot|#x27);/g, (entity) => ENTITIES[entity]!)
}

/** Splits on <mark>…</mark>; every other tag-like text stays text. */
export function parseHighlight(html: string): HighlightPart[] {
  const parts: HighlightPart[] = []
  for (const [index, piece] of html.split(/<\/?mark>/).entries()) {
    // Pieces alternate: outside a mark, inside a mark, outside...
    if (piece) parts.push({ text: unescape(piece), mark: index % 2 === 1 })
  }
  return parts
}

/** Only the marked words, each once (case aside), in the order they first appear. */
export function matchedWords(html: string): string[] {
  const seen = new Set<string>()
  const words: string[] = []
  for (const { text, mark } of parseHighlight(html)) {
    const key = text.toLowerCase()
    if (mark && !seen.has(key)) {
      seen.add(key)
      words.push(text)
    }
  }
  return words
}

/** `<@user_id>` mentions as `@Name`, as in the message list. */
export function showMentions(text: string, names: Record<string, string>): string {
  return text.replace(/<@([0-9a-fA-F-]{36})>/g, (_, id: string) => `@${names[id] ?? "unknown"}`)
}
