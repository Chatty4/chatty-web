import { useMemo, useRef, useState, type KeyboardEvent } from "react"
import { AtSign, Paperclip, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmojiPickerButton } from "@/components/ui/emoji-picker"

import { MAX_MESSAGE_LENGTH as MAX_LENGTH } from "../constants"
import {
  encodeMentions,
  extractMentionIds,
  findMentionQuery,
  type MentionCandidate,
} from "../utils/mentions"

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageComposerProps = {
  /** Channel members used for @mention autocomplete. */
  members: MentionCandidate[]
  /** When true the textarea is disabled and shows an archived notice. */
  archived?: boolean
  /** The text to start with, such as what was left here before switching channel. */
  initialDraft?: string
  onDraftChange?: (text: string) => void
  /** Called on every change, with whether any text is left in the box. */
  onTextChange?: (hasText: boolean) => void
  /** Called when the user submits a message. */
  onSend: (body: string) => Promise<void>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MessageComposer({
  members,
  archived = false,
  initialDraft = "",
  onDraftChange,
  onTextChange,
  onSend,
}: MessageComposerProps) {
  const [value, setStoredValue] = useState(initialDraft)
  const [activeIndex, setActiveIndex] = useState(0)
  const [caret, setCaret] = useState(initialDraft.length)
  // The @ whose suggestions were closed with Esc: they stay closed for that mention.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null)
  // Who was chosen from the list: the text alone can't tell two people with one name apart.
  const [picks, setPicks] = useState<MentionCandidate[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const setValue = (next: string) => {
    setStoredValue(next)
    onDraftChange?.(next)
    onTextChange?.(next.trim() !== "")
  }

  const found = findMentionQuery(value, caret)
  const mention = found && found.start !== dismissedAt ? found : null
  const query = mention?.query.toLowerCase()
  const suggestions =
    query === undefined
      ? []
      : members.filter((m) => m.display_name.toLowerCase().includes(query)).slice(0, 5)

  // Clamp so activeIndex never points past the end of the current list.
  const clampedIndex = suggestions.length > 0 ? Math.min(activeIndex, suggestions.length - 1) : 0

  const encoded = useMemo(
    () => encodeMentions(value.trim(), members, picks),
    [value, members, picks],
  )
  const tooLong = encoded.length > MAX_LENGTH

  const send = () => {
    const body = encoded
    if (!body || archived || tooLong) return
    setValue("")
    setPicks([])
    void onSend(body)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const moveCaret = (position: number) => {
    setCaret(position)
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(position, position)
    })
  }

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    const next = value.slice(0, start) + text + value.slice(end)
    if (next.length > MAX_LENGTH) return
    setValue(next)
    moveCaret(start + text.length)
  }

  const applyMention = (candidate: MentionCandidate) => {
    if (!mention) return
    const inserted = `@${candidate.display_name} `
    // In text order, so each @name finds its own pick.
    const earlier = encodeMentions(value.slice(0, mention.start), members, picks)
    const position = extractMentionIds(earlier).length
    setPicks([...picks.slice(0, position), candidate, ...picks.slice(position)])
    setValue(value.slice(0, mention.start) + inserted + value.slice(caret))
    setActiveIndex(0)
    moveCaret(mention.start + inserted.length)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0 && !e.nativeEvent.isComposing) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % suggestions.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === "Tab" || (e.key === "Enter" && suggestions.length > 0)) {
        e.preventDefault()
        const candidate = suggestions[clampedIndex]
        if (candidate) applyMention(candidate)
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setDismissedAt(mention?.start ?? null)
        return
      }
    }
    // Ignore Enter while an IME composition is in progress (e.g. Japanese input).
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  const charCount = encoded.length
  const nearLimit = charCount > 3600

  return (
    <div className="relative px-4 pb-4 pt-2">
      {/* @mention suggestion list */}
      {suggestions.length > 0 && (
        <div
          role="listbox"
          aria-label="Mention suggestions"
          className="absolute bottom-full left-4 right-4 mb-1 overflow-hidden rounded-md border bg-surface shadow-md"
        >
          {suggestions.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="option"
              aria-selected={i === clampedIndex}
              className={[
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
                i === clampedIndex ? "bg-surface-hover" : "hover:bg-surface-hover",
              ].join(" ")}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault() // keep textarea focus
                applyMention(m)
              }}
            >
              <span
                aria-hidden="true"
                className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[10px] font-semibold text-primary"
              >
                {m.display_name.charAt(0).toUpperCase()}
              </span>
              <span>{m.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Composer box */}
      <div className="flex flex-col rounded-md border border-input bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-accent">
        <textarea
          ref={textareaRef}
          className="min-h-[60px] w-full resize-none bg-transparent px-3 pt-3 text-sm text-foreground outline-none placeholder:text-faint-foreground disabled:cursor-not-allowed disabled:opacity-50"
          value={value}
          maxLength={MAX_LENGTH}
          rows={2}
          disabled={archived}
          aria-label="Write a message"
          placeholder={archived ? "This channel has been archived." : "Write a message…"}
          onChange={(e) => {
            setValue(e.target.value)
            setCaret(e.target.selectionStart)
            setActiveIndex(0)
            // Typing a new @, or removing this one, brings suggestions back.
            if (findMentionQuery(e.target.value, e.target.selectionStart)?.start !== dismissedAt) {
              setDismissedAt(null)
            }
          }}
          onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
          onKeyDown={handleKeyDown}
        />

        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          {/* Formatting / extras toolbar */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Attach file"
              disabled={archived}
              onClick={() => {/* file uploads — future ticket */}}
            >
              <Paperclip />
            </Button>
            <EmojiPickerButton
              disabled={archived}
              returnFocusRef={textareaRef}
              onSelect={insertAtCursor}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Mention someone"
              disabled={archived}
              onClick={() => insertAtCursor("@")}
            >
              <AtSign />
            </Button>
          </div>

          {/* Send side */}
          <div className="flex items-center gap-2">
            {nearLimit && (
              <span className="text-xs text-muted-foreground">
                {charCount}/{MAX_LENGTH}
              </span>
            )}
            {!nearLimit && (
              <span className="hidden text-xs text-faint-foreground sm:block">
                Enter to send
              </span>
            )}
            <Button
              size="icon-sm"
              aria-label="Send message"
              disabled={!value.trim() || archived || tooLong}
              onClick={send}
            >
              <Send />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
