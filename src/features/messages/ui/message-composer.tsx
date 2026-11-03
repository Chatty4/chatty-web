import { useMemo, useRef, useState, type KeyboardEvent } from "react"
import { AtSign, Paperclip, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmojiPickerButton } from "@/components/ui/emoji-picker"

const MAX_LENGTH = 4000

// ── Types ─────────────────────────────────────────────────────────────────────

type MentionCandidate = {
  id: string
  display_name: string
}

export type MessageComposerProps = {
  /** Channel members used for @mention autocomplete. */
  members: MentionCandidate[]
  /** When true the textarea is disabled and shows an archived notice. */
  archived?: boolean
  /** Called when the user submits a message. */
  onSend: (body: string) => Promise<void>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MessageComposer({ members, archived = false, onSend }: MessageComposerProps) {
  const [value, setValue] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Detect @mention being typed at the cursor end.
  const mentionMatch = value.match(/@([\w]*)$/)
  const suggestions = useMemo<MentionCandidate[]>(() => {
    if (!mentionMatch) return []
    const query = mentionMatch[1].toLowerCase()
    return members
      .filter((m) => m.display_name.toLowerCase().includes(query))
      .slice(0, 5)
  }, [mentionMatch, members])

  // Clamp so activeIndex never points past the end of the current list.
  const clampedIndex = suggestions.length > 0 ? Math.min(activeIndex, suggestions.length - 1) : 0

  const send = () => {
    const body = value.trim()
    if (!body || archived) return
    setValue("")
    void onSend(body)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    const next = value.slice(0, start) + text + value.slice(end)
    if (next.length > MAX_LENGTH) return
    setValue(next)
    const caret = start + text.length
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(caret, caret)
    })
  }

  const applyMention = (name: string) => {
    const firstName = name.split(" ")[0]
    setValue((prev) => prev.replace(/@[\w]*$/, `@${firstName} `))
    setActiveIndex(0)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
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
        if (candidate) applyMention(candidate.display_name)
        return
      }
      if (e.key === "Escape") {
        // Dismiss suggestions without closing by inserting a zero-width space
        // — simplest way to break the @-pattern match without changing visible text.
        setValue((prev) => prev + "​")
        return
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const charCount = value.length
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
                applyMention(m.display_name)
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
            const next = e.target.value
            // Reset suggestion index when the @query changes (new/different mention).
            const nextQuery = next.match(/@([\w]*)$/)?.[1]
            const prevQuery = value.match(/@([\w]*)$/)?.[1]
            if (nextQuery !== prevQuery) setActiveIndex(0)
            setValue(next)
          }}
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
              onClick={() => setValue((v) => `${v}@`)}
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
              disabled={!value.trim() || archived}
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
