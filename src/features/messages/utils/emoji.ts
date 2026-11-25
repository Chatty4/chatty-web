// A message that is just one emoji shows it big, as chat apps do.

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" })

/** What an emoji can start with: a pictograph, a flag letter, or a keycap's digit, # or *. */
const EMOJI_START = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[#*0-9]️?⃣)/u
/**
 * Drawn as an emoji, not as a text symbol: ❤️ has the U+FE0F selector, while © or ☺ on its
 * own is text.
 */
const EMOJI_LOOK = /\p{Emoji_Presentation}|️/u

/**
 * True when the body is exactly one emoji, as people see it: 👍🏽, 👨‍👩‍👧 and 🇷🇴 are one each.
 * Spaces around it don't count.
 */
export function isSingleEmoji(body: string): boolean {
  const text = body.trim()
  if (!text) return false
  const [first, second] = graphemes.segment(text)
  if (!first || second) return false
  return EMOJI_START.test(first.segment) && EMOJI_LOOK.test(first.segment)
}
