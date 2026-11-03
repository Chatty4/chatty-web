import { useEffect, useRef, useState } from "react"
import { Check, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import type { LocalMessage } from "../types"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

/** Highlight @mentions in message body text. */
function MessageText({ body, own }: { body: string; own: boolean }) {
  const parts = body.split(/(@\w+)/g)
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span
            key={i}
            className={cn(
              "rounded px-0.5 font-medium text-primary",
              own ? "bg-surface/70" : "bg-accent",
            )}
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
  /** True when the message was written by the current user (shown on the right). */
  own: boolean
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
  own,
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

  const startEditing = () => {
    setDraft(message.body) // always reset to current body when entering edit mode
    setEditing(true)
  }

  const save = () => {
    const value = draft.trim()
    if (value && value !== message.body) void onEdit(message.id, value)
    setEditing(false)
  }

  const handleDeleteConfirm = () => {
    setConfirmDelete(false)
    void onDelete(message.id)
  }

  const time = (
    <time className="text-xs text-muted-foreground" dateTime={message.created_at}>
      {formatTime(message.created_at)}
    </time>
  )

  const status = (
    <>
      {message.status === "pending" && (
        <span className="text-xs text-faint-foreground">Sending…</span>
      )}
      {message.status === "failed" && (
        <span className="text-xs text-destructive">
          Not sent{" "}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-1 py-0 text-xs"
            onClick={() =>
              message.client_msg_id && void onRetry(message.channel_id, message.client_msg_id)
            }
          >
            <RotateCcw className="size-3" />
            Retry
          </Button>
        </span>
      )}
    </>
  )

  const editor = (
    <div className="flex w-full flex-col gap-1">
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
      <div
        className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground",
          own && "justify-end",
        )}
      >
        <span>Esc to cancel · Enter to save</span>
        <Button size="sm" onClick={save}>
          <Check className="size-3.5" />
          Save
        </Button>
      </div>
    </div>
  )

  const toolbar = !isDeleted && !editing && (
    <div
      className={cn(
        "absolute top-0 z-10 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border bg-surface shadow-sm group-hover/msg:flex",
        own ? "left-3" : "right-3",
      )}
    >
      {editable && (
        <Button variant="ghost" size="icon-sm" aria-label="Edit message" onClick={startEditing}>
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
  )

  if (own) {
    return (
      <article
        className={cn(
          "group/msg relative flex flex-col items-end px-4 py-0.5",
          grouped ? "mt-0" : "mt-3",
        )}
        data-message-id={message.id}
      >
        {!grouped && <div className="mb-1 px-1">{time}</div>}

        {editing ? (
          <div className="w-full max-w-[75%]">{editor}</div>
        ) : isDeleted ? (
          <p className="rounded-lg border border-dashed px-3 py-1.5 text-sm italic text-muted-foreground">
            This message was deleted.
          </p>
        ) : (
          <div
            className={cn(
              "max-w-[75%] rounded-lg bg-accent px-3 py-1.5 text-sm leading-relaxed break-words text-foreground",
              !grouped && "rounded-tr-sm",
              message.status === "pending" && "opacity-70",
              message.status === "failed" && "ring-1 ring-destructive/50",
            )}
          >
            <MessageText body={message.body} own />
            {isEdited && <span className="ml-1 text-xs text-muted-foreground">(edited)</span>}
          </div>
        )}

        {message.status !== "sent" && !editing && <div className="mt-0.5 px-1">{status}</div>}

        {toolbar}
      </article>
    )
  }

  return (
    <article
      className={cn(
        "group/msg relative flex gap-2.5 px-4 py-0.5 hover:bg-surface-hover",
        grouped ? "mt-0" : "mt-3",
      )}
      data-message-id={message.id}
    >
      {/* Avatar column */}
      <div className="w-8 shrink-0">{!grouped && <Avatar name={authorName} />}</div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="mb-0.5 flex items-baseline gap-2">
            <strong className="text-sm font-semibold leading-snug">{authorName}</strong>
            {time}
          </div>
        )}

        {isDeleted ? (
          <p className="text-sm italic text-muted-foreground">This message was deleted.</p>
        ) : editing ? (
          editor
        ) : (
          <p className="text-sm leading-relaxed break-words">
            <MessageText body={message.body} own={false} />
            {isEdited && <span className="ml-1 text-xs text-muted-foreground">(edited)</span>}
            {message.status !== "sent" && <span className="ml-1">{status}</span>}
          </p>
        )}
      </div>

      {toolbar}
    </article>
  )
}
