import { useLayoutEffect, useRef, type RefObject } from "react"

import { emoticonBefore, replaceEmoticon, typedEmoticon, type FoundEmoticon } from "../utils/emoticons"

export type TextAndCaret = { value: string; caret: number }

/**
 * Turns emoticons into emoji in a text box: when a space or line break finishes one, and the one
 * a message ends with when it is sent. Backspace right after a swap brings the text back, and that
 * emoticon then stays text.
 */
export function useEmoticons(ref: RefObject<HTMLTextAreaElement | null>) {
  // The last swap, while the text is still as it left it.
  const last = useRef<{ found: FoundEmoticon; value: string; caret: number } | null>(null)
  // The emoticon brought back with Backspace.
  const kept = useRef<{ start: number; emoticon: string } | null>(null)
  // Where the cursor goes once the changed text is on the page, before the next key arrives.
  const pendingCaret = useRef<number | null>(null)

  useLayoutEffect(() => {
    const caret = pendingCaret.current
    if (caret === null) return
    pendingCaret.current = null
    ref.current?.setSelectionRange(caret, caret)
  })

  const isKept = (found: FoundEmoticon) =>
    kept.current?.start === found.start && kept.current.emoticon === found.emoticon

  /** For onChange: the new text, with the emoticon a typed space or line break finished swapped. */
  const onType = (previous: string, next: string, caret: number): TextAndCaret => {
    last.current = null
    const found = typedEmoticon(previous, next, caret)
    if (!found || isKept(found)) return { value: next, caret }
    const value = replaceEmoticon(next, found)
    const moved = caret - found.emoticon.length + found.emoji.length
    last.current = { found, value, caret: moved }
    pendingCaret.current = moved
    return { value, caret: moved }
  }

  /** For Backspace: right after a swap, the emoticon instead of the emoji and the space. */
  const undo = (value: string, caret: number): TextAndCaret | null => {
    const swap = last.current
    last.current = null
    if (!swap || swap.value !== value || swap.caret !== caret) return null
    const { start, emoticon } = swap.found
    kept.current = { start, emoticon }
    pendingCaret.current = start + emoticon.length
    return { value: value.slice(0, start) + emoticon + value.slice(caret), caret: start + emoticon.length }
  }

  /** For sending: the text with the emoticon it ends with swapped. */
  const finish = (value: string): string => {
    const found = emoticonBefore(value, value.trimEnd().length)
    return found && !isKept(found) ? replaceEmoticon(value, found) : value
  }

  return { onType, undo, finish }
}
