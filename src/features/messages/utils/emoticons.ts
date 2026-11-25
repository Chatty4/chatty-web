// Text faces typed in a message, such as :) or <3, become the emoji they stand for.

/** Each emoticon and its emoji. Letters are matched as written: :P and :p are both listed. */
export const EMOTICONS: Readonly<Record<string, string>> = {
  ":)": "🙂",
  ":-)": "🙂",
  ":(": "🙁",
  ":-(": "🙁",
  ":D": "😃",
  ":-D": "😃",
  "xD": "😆",
  "XD": "😆",
  ";)": "😉",
  ";-)": "😉",
  ":P": "😛",
  ":-P": "😛",
  ":p": "😛",
  ":-p": "😛",
  ":O": "😮",
  ":-O": "😮",
  ":o": "😮",
  ":-o": "😮",
  ":|": "😐",
  ":-|": "😐",
  ":/": "😕",
  ":-/": "😕",
  ":'(": "😢",
  ":*": "😘",
  ":-*": "😘",
  ">:(": "😠",
  "B-)": "😎",
  "8-)": "😎",
  "<3": "❤️",
  "</3": "💔",
}

export type FoundEmoticon = { start: number; end: number; emoticon: string; emoji: string }

/** True when `index` is inside `inline code` or a ``` block, where text is kept as typed. */
function insideCode(text: string, index: number): boolean {
  const before = text.slice(0, index)
  const fences = before.split("```")
  if (fences.length % 2 === 0) return true
  const backticks = fences.at(-1)!.match(/`/g)?.length ?? 0
  return backticks % 2 === 1
}

/**
 * The emoticon that ends at `end`, as a word of its own (spaces or the edges around it) and
 * outside code. "a:)" or "http://" are not emoticons.
 */
export function emoticonBefore(text: string, end: number): FoundEmoticon | null {
  let start = end
  while (start > 0 && !/\s/.test(text[start - 1]!)) start--
  const emoticon = text.slice(start, end)
  const emoji = EMOTICONS[emoticon]
  if (!emoji || insideCode(text, start)) return null
  return { start, end, emoticon, emoji }
}

/** The emoticon a space or line break just typed at `caret - 1` finishes, if any. */
export function typedEmoticon(previous: string, next: string, caret: number): FoundEmoticon | null {
  if (next.length !== previous.length + 1 || caret < 1 || !/\s/.test(next[caret - 1]!)) return null
  return emoticonBefore(next, caret - 1)
}

/** The text with the emoticon swapped for its emoji. */
export function replaceEmoticon(text: string, found: FoundEmoticon): string {
  return text.slice(0, found.start) + found.emoji + text.slice(found.end)
}
