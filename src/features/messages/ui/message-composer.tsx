import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react"
import { AtSign, Paperclip, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmojiPickerButton } from "@/components/ui/emoji-picker"
import { UploadChip, useFileUploads } from "@/features/files"
import { GifPickerButton } from "@/features/gifs"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

import { MAX_MESSAGE_FILES, MAX_MESSAGE_LENGTH as MAX_LENGTH } from "../constants"
import type { Attachment, ReplyPreview } from "../types"
import {
  encodeMentions,
  extractMentionIds,
  findMentionQuery,
  type MentionCandidate,
} from "../utils/mentions"
import { ReplyBar } from "./reply-bar"

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageComposerProps = {
  /** The channel's team: attachments are uploaded for it. */
  teamId: string
  /** Channel members used for @mention autocomplete. */
  members: MentionCandidate[]
  /** When true the textarea is disabled and shows an archived notice. */
  archived?: boolean
  /** The text to start with, such as what was left here before switching channel. */
  initialDraft?: string
  onDraftChange?: (text: string) => void
  /** Called on every change, with whether any text is left in the box. */
  onTextChange?: (hasText: boolean) => void
  /** Called when the user submits a message, with its files in the order they were picked. */
  onSend: (body: string, attachments: Attachment[]) => Promise<void>
  /** The message this one replies to, shown above the box. */
  replyTo?: ReplyPreview | null
  /** userId → display name, for the reply's author and mentions in its text. */
  names?: Record<string, string>
  /** ✕ or Esc on a reply. */
  onCancelReply?: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MessageComposer({
  teamId,
  members,
  archived = false,
  initialDraft = "",
  onDraftChange,
  onTextChange,
  onSend,
  replyTo = null,
  names = {},
  onCancelReply,
}: MessageComposerProps) {
  const [value, setStoredValue] = useState(initialDraft)
  const [activeIndex, setActiveIndex] = useState(0)
  const [caret, setCaret] = useState(initialDraft.length)
  // The @ whose suggestions were closed with Esc: they stay closed for that mention.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null)
  // Who was chosen from the list: the text alone can't tell two people with one name apart.
  const [picks, setPicks] = useState<MentionCandidate[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Opening a conversation puts the cursor here, after any saved draft, so typing just works.
  // The composer is keyed by channel, so this runs once per conversation.
  useEffect(() => {
    const el = textareaRef.current
    if (!el || el.disabled) return
    el.focus({ preventScroll: true })
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  // Choosing Reply on a message moves the cursor here, to write the reply.
  const replyId = replyTo?.id
  useEffect(() => {
    if (replyId) textareaRef.current?.focus({ preventScroll: true })
  }, [replyId])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploads, add: addUploads, remove: removeUpload, clear: clearUploads } =
    useFileUploads("attachment", teamId)

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

  const attachments: Attachment[] = uploads.flatMap(({ uploaded }) =>
    uploaded
      ? [{ file_id: uploaded.id, filename: uploaded.filename, mime: uploaded.mime, size: uploaded.size }]
      : [],
  )
  // Every picked file must be ready: a failed one has to be removed first.
  const filesReady = attachments.length === uploads.length
  const canSend = !archived && !tooLong && filesReady && (encoded !== "" || attachments.length > 0)

  const send = () => {
    if (!canSend) return
    setValue("")
    setPicks([])
    clearUploads()
    void onSend(encoded, attachments)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const pickFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || archived) return
    const room = MAX_MESSAGE_FILES - uploads.length
    if (files.length > room) toast.error(`A message can have at most ${MAX_MESSAGE_FILES} files.`)
    addUploads(Array.from(files).slice(0, Math.max(room, 0)))
  }

  // A file dragged over the composer: it shows where to drop it.
  const [dragging, setDragging] = useState(false)
  const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files")

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
    if (e.key === "Escape" && replyTo && onCancelReply) {
      e.preventDefault()
      onCancelReply()
      return
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
      <div
        className={cn(
          "relative flex flex-col rounded-md border border-input bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-accent",
          dragging && "border-primary ring-2 ring-accent",
        )}
        onDragOver={(e) => {
          if (archived || !hasFiles(e)) return
          e.preventDefault() // allows the drop
          setDragging(true)
        }}
        onDragLeave={(e) => {
          // Moving onto a child also fires dragleave: only leaving the box counts.
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
        }}
        onDrop={(e) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          setDragging(false)
          pickFiles(e.dataTransfer.files)
        }}
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-md bg-surface/90 text-sm font-medium text-primary">
            Drop files to attach
          </div>
        )}
        {replyTo && !archived && onCancelReply && (
          <ReplyBar quote={replyTo} names={names} onCancel={onCancelReply} />
        )}
        {uploads.length > 0 && (
          <ul aria-label="Attached files" className="flex flex-wrap gap-2 px-3 pt-3">
            {uploads.map((upload) => (
              <li key={upload.key}>
                <UploadChip upload={upload} onRemove={() => removeUpload(upload.key)} />
              </li>
            ))}
          </ul>
        )}
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
          onPaste={(e) => {
            // Ctrl+V of a copied file or screenshot attaches it; plain text pastes as usual.
            if (e.clipboardData.files.length === 0) return
            e.preventDefault()
            pickFiles(e.clipboardData.files)
          }}
        />

        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          {/* Formatting / extras toolbar */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Attach file"
              disabled={archived || uploads.length >= MAX_MESSAGE_FILES}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                pickFiles(e.target.files)
                e.target.value = "" // so the same file can be picked again
              }}
            />
            <EmojiPickerButton
              disabled={archived}
              returnFocusRef={textareaRef}
              onSelect={insertAtCursor}
            />
            {/* A GIF goes out at once as its own message; what's typed stays in the box. */}
            <GifPickerButton
              disabled={archived}
              returnFocusRef={textareaRef}
              onSelect={(url) => void onSend(url, [])}
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
              disabled={!canSend}
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
