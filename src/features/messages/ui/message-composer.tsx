import { useMemo, useRef, useState, type KeyboardEvent } from "react"
import { AtSign, Paperclip, Send, Smile } from "lucide-react"

import { Button } from "@/components/ui/button"

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

  const send = () => {
    const body = value.trim()
    if (!body || archived) return
    setValue("")
    void onSend(body)
    // Re-focus textarea after clearing.
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const applyMention = (name: string) => {
    const firstName = name.split(" ")[0]
    setValue((prev) => prev.replace(/@[\w]*$/, `@${firstName} `))
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
        <div className="absolute bottom-full left-4 right-4 mb-1 rounded-md border bg-surface shadow-md">
          {suggestions.map((m) => (
            <button
              key={m.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-hover"
              onMouseDown={(e) => {
                // Prevent textarea blur before we can apply the mention.
                e.preventDefault()
                applyMention(m.display_name)
              }}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[10px] font-semibold text-primary">
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
          maxLength={4000}
          rows={2}
          disabled={archived}
          aria-label="Write a message"
          placeholder={archived ? "This channel has been archived." : "Write a message…"}
          onChange={(e) => setValue(e.target.value)}
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
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Add emoji"
              disabled={archived}
              onClick={() => setValue((v) => `${v} 🙂`)}
            >
              <Smile />
            </Button>
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
                {charCount}/4000
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
