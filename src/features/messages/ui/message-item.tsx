import { useEffect, useRef, useState } from "react"
import { Check, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { useConfirm } from "@/hooks/use-confirm"
import { cn } from "@/lib/utils"

import type { LocalMessage } from "../types"
import { decodeMentions, encodeMentions, splitMentions } from "../utils/mentions"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

/** Renders a stored body, showing `<@id>` mentions as `@Display Name`. */
function MessageText({
  body,
  own,
  names,
}: {
  body: string
  own: boolean
  names: Record<string, string>
}) {
  return (
    <span>
      {splitMentions(body).map((part, i) =>
        part.type === "mention" ? (
          <span
            key={i}
            className={cn(
              "font-medium text-primary",
              own ? "font-semibold" : "rounded-[4px] bg-accent px-1 py-px",
            )}
          >
            @{names[part.userId] ?? "unknown user"}
          </span>
        ) : (
          part.value
        ),
      )}
    </span>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageItemProps = {
  message: LocalMessage
  authorName: string
  /** userId → display name, used to show and edit `<@id>` mentions. */
  names: Record<string, string>
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
  names,
  grouped,
  own,
  editable,
  onEdit,
  onDelete,
  onRetry,
}: MessageItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.body)
  const { confirm, confirmProps } = useConfirm()
  const editorRef = useRef<HTMLInputElement>(null)

  const isDeleted = message.deleted_at !== null
  const isEdited = message.edited_at !== null && !isDeleted

  useEffect(() => {
    if (editing) editorRef.current?.focus()
  }, [editing])

  const startEditing = () => {
    setDraft(decodeMentions(message.body, names))
    setEditing(true)
  }

  const save = () => {
    const candidates = Object.entries(names).map(([id, display_name]) => ({ id, display_name }))
    const value = encodeMentions(draft.trim(), candidates)
    if (value && value.length <= 4000 && value !== message.body) void onEdit(message.id, value)
    setEditing(false)
  }

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete message?",
      description: "This message will be removed for everyone in the channel.",
      action: "Delete",
      destructive: true,
    })
    if (ok) void onDelete(message.id)
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
        "absolute z-10 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border bg-surface shadow-sm group-hover/msg:flex",
        own ? "top-1/2 right-full mr-1.5" : "top-0 right-3",
      )}
    >
      {editable && (
        <Button variant="ghost" size="icon-sm" aria-label="Edit message" onClick={startEditing}>
          <Pencil />
        </Button>
      )}
      {editable && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete message"
          onClick={() => void handleDelete()}
        >
          <Trash2 />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="More message options"
        onClick={() => {/* reactions / thread — future tickets */}}
      >
        <MoreHorizontal />
      </Button>
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
        <ConfirmDialog {...confirmProps} />
        {!grouped && <div className="mb-1 px-1">{time}</div>}

        {editing ? (
          <div className="w-full max-w-[75%]">{editor}</div>
        ) : isDeleted ? (
          <p className="rounded-lg border border-dashed px-3 py-1.5 text-sm italic text-muted-foreground">
            This message was deleted.
          </p>
        ) : (
          <div className="relative max-w-[75%]">
            <div
              className={cn(
                "rounded-lg bg-accent px-3 py-1.5 text-sm leading-relaxed break-words text-foreground",
                !grouped && "rounded-tr-sm",
                message.status === "pending" && "opacity-70",
                message.status === "failed" && "ring-1 ring-destructive/50",
              )}
            >
              <MessageText body={message.body} own names={names} />
              {isEdited && <span className="ml-1 text-xs text-muted-foreground">(edited)</span>}
            </div>
            {toolbar}
          </div>
        )}

        {message.status !== "sent" && !editing && <div className="mt-0.5 px-1">{status}</div>}
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
      <ConfirmDialog {...confirmProps} />
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
            <MessageText body={message.body} own={false} names={names} />
            {isEdited && <span className="ml-1 text-xs text-muted-foreground">(edited)</span>}
            {message.status !== "sent" && <span className="ml-1">{status}</span>}
          </p>
        )}
      </div>

      {toolbar}
    </article>
  )
}
