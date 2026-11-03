import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { MAX_MESSAGE_LENGTH } from "../constants"

type MessageEditorProps = {
  /** Text shown when the editor opens (mentions already decoded to @names). */
  initialValue: string
  /** Length of the text as it will be sent; defaults to its plain length. */
  measure?: (text: string) => number
  /** A message with files may have an empty body (api-chat.md PUT /messages/{id}). */
  allowEmpty?: boolean
  align?: "start" | "end"
  /** Resolves when saved; a rejection keeps the editor open and shows the error. */
  onSave: (text: string) => Promise<void>
  onCancel: () => void
  describeError: (error: unknown) => string
}

/** Inline editor: Enter saves, Shift+Enter adds a new line, Esc cancels. */
export function MessageEditor({
  initialValue,
  measure = (text) => text.length,
  allowEmpty = false,
  align = "start",
  onSave,
  onCancel,
  describeError,
}: MessageEditorProps) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const ref = useRef<HTMLTextAreaElement>(null)
  const messageId = useId()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  const trimmed = value.trim()
  const length = measure(trimmed)
  const validation =
    !trimmed && !allowEmpty
      ? "A message can't be empty."
      : length > MAX_MESSAGE_LENGTH
        ? `Too long: ${length}/${MAX_MESSAGE_LENGTH} characters.`
        : undefined
  const shownError = validation ?? error

  const save = async () => {
    if (saving || validation) return
    if (trimmed === initialValue.trim()) {
      onCancel()
      return
    }
    setSaving(true)
    setError(undefined)
    try {
      await onSave(trimmed)
    } catch (err) {
      setError(describeError(err))
      setSaving(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault()
      onCancel()
      return
    }
    // Ignore Enter while an IME composition is in progress (e.g. Japanese input).
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void save()
    }
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      <Textarea
        ref={ref}
        rows={2}
        value={value}
        disabled={saving}
        aria-label="Edit message"
        aria-invalid={shownError ? true : undefined}
        aria-describedby={shownError ? messageId : undefined}
        className="max-h-60 border-primary"
        onChange={(e) => {
          setValue(e.target.value)
          setError(undefined)
        }}
        onKeyDown={handleKeyDown}
      />
      <div
        className={cn(
          "flex items-center gap-2 text-[11px] text-faint-foreground",
          align === "end" ? "justify-end" : "justify-between",
        )}
      >
        {shownError ? (
          <span id={messageId} role="alert" className="text-destructive">
            {shownError}
          </span>
        ) : (
          <span>Esc to cancel · Enter to save · Shift+Enter for a new line</span>
        )}
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" disabled={saving || !!validation} onClick={() => void save()}>
            <Check className="size-3.5" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  )
}
