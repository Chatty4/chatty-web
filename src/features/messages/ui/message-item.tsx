import { useEffect, useRef, useState } from "react"
import { Check, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, initials } from "@/components/ui/avatar"

import type { LocalMessage } from "../types"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

/** Highlight @mentions in message body text. */
function MessageText({ body }: { body: string }) {
  const parts = body.split(/(@\w+)/g)
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span
            key={i}
            className="rounded px-0.5 font-medium text-primary bg-accent/30"
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </span>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageItemProps = {
  message: LocalMessage
  authorName: string
  /** Whether this message immediately follows one from the same author. */
  grouped: boolean
  /** True when the current user can edit / delete this message. */
  editable: boolean
  onEdit: (messageId: string, body: string) => Promise<void>
  onDelete: (messageId: string) => Promise<void>
  onRetry: (channelId: string, clientMsgId: string) => Promise<void>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MessageItem({
  message,
  authorName,
  grouped,
  editable,
  onEdit,
  onDelete,
  onRetry,
}: MessageItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.body)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const editorRef = useRef<HTMLInputElement>(null)

  const isDeleted = message.deleted_at !== null
  const isEdited = message.edited_at !== null && !isDeleted

  useEffect(() => {
    if (editing) editorRef.current?.focus()
  }, [editing])

  // Reset draft when the message body changes externally (e.g. WS edit event).
  useEffect(() => {
    setDraft(message.body)
  }, [message.body])

  const save = () => {
    const value = draft.trim()
    if (value && value !== message.body) void onEdit(message.id, value)
    setEditing(false)
  }

  const handleDeleteConfirm = () => {
    setConfirmDelete(false)
    void onDelete(message.id)
  }

  return (
    <article
      className={[
        "group/msg relative flex gap-2.5 px-4 py-0.5 hover:bg-surface-hover",
        grouped ? "mt-0" : "mt-3",
      ].join(" ")}
      data-message-id={message.id}
    >
      {/* Avatar column */}
      <div className="w-8 shrink-0">
        {!grouped && <Avatar name={authorName} />}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="mb-0.5 flex items-baseline gap-2">
            <strong className="text-sm font-semibold leading-snug">
              {authorName}
            </strong>
            <time className="text-xs text-muted-foreground" dateTime={message.created_at}>
              {formatTime(message.created_at)}
            </time>
          </div>
        )}

        {isDeleted ? (
          <p className="text-sm italic text-muted-foreground">
            This message was deleted.
          </p>
        ) : editing ? (
          <div className="flex flex-col gap-1">
            <Input
              ref={editorRef}
              value={draft}
              maxLength={4000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDraft(message.body)
                  setEditing(false)
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  save()
                }
              }}
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Esc to cancel · Enter to save</span>
              <Button size="sm" onClick={save}>
                <Check className="size-3.5" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed break-words">
            <MessageText body={message.body} />
            {isEdited && (
              <span className="ml-1 text-xs text-muted-foreground">(edited)</span>
            )}
            {message.status === "pending" && (
              <span className="ml-1 text-xs text-faint-foreground">Sending…</span>
            )}
            {message.status === "failed" && (
              <span className="ml-1 text-xs text-destructive">
                Not sent{" "}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-1 py-0 text-xs"
                  onClick={() =>
                    message.client_msg_id &&
                    void onRetry(message.channel_id, message.client_msg_id)
                  }
                >
                  <RotateCcw className="size-3" />
                  Retry
                </Button>
              </span>
            )}
          </p>
        )}
      </div>

      {/* Hover action toolbar */}
      {!isDeleted && !editing && (
        <div className="absolute right-3 top-0 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border bg-surface shadow-sm group-hover/msg:flex">
          {editable && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit message"
              onClick={() => setEditing(true)}
            >
              <Pencil />
            </Button>
          )}
          {editable && !confirmDelete && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete message"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 />
            </Button>
          )}
          {confirmDelete && (
            <div className="flex items-center gap-1 px-1">
              <span className="text-xs text-destructive">Delete?</span>
              <Button size="sm" variant="destructive" onClick={handleDeleteConfirm}>
                Yes
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                No
              </Button>
            </div>
          )}
          {!confirmDelete && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="More message options"
              onClick={() => {/* reactions / thread — future tickets */}}
            >
              <MoreHorizontal />
            </Button>
          )}
        </div>
      )}
    </article>
  )
}

export { initials }
