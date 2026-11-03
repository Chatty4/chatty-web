import { useState } from "react"
import { MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirm } from "@/hooks/use-confirm"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

import type { LocalMessage } from "../types"
import { describeMessageError, messageErrorCode } from "../utils/errors"
import { decodeMentions, encodeMentions, splitMentions } from "../utils/mentions"
import { MessageEditor } from "./message-editor"

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
  /** From canEdit (D-05): my own sent message in a channel I can write in. */
  canEdit: boolean
  /** From canDelete (D-05). */
  canDelete: boolean
  /** Rejects with ApiError on failure. */
  onEdit: (messageId: string, body: string) => Promise<void>
  /** Rejects with ApiError on failure. */
  onDelete: (messageId: string) => Promise<void>
  onRetry: (channelId: string, clientMsgId: string) => Promise<void>
  /** Called when the server says the channel is archived, so the view can go read-only. */
  onChannelArchived: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MessageItem({
  message,
  authorName,
  names,
  grouped,
  own,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onRetry,
  onChannelArchived,
}: MessageItemProps) {
  const [editing, setEditing] = useState(false)
  const { confirm, confirmProps } = useConfirm()

  const isDeleted = message.deleted_at !== null
  const isEdited = message.edited_at !== null && !isDeleted
  // Close the editor if the message gets deleted (e.g. from another tab) while open.
  const showEditor = editing && !isDeleted

  const candidates = Object.entries(names).map(([id, display_name]) => ({ id, display_name }))
  const encode = (text: string) => encodeMentions(text, candidates)

  // Errors that end the edit close the editor with a toast; the rest reject so the
  // editor stays open and shows them inline.
  const saveEdit = async (text: string) => {
    try {
      await onEdit(message.id, encode(text))
      setEditing(false)
    } catch (err) {
      const code = messageErrorCode(err)
      if (code === "message_deleted" || code === "channel_archived") {
        toast.error(describeMessageError(err))
        if (code === "channel_archived") onChannelArchived()
        setEditing(false)
        return
      }
      throw err
    }
  }

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete this message?",
      description: "Its contents will be replaced with a deleted message placeholder.",
      action: "Delete message",
      destructive: true,
    })
    if (!ok) return
    try {
      await onDelete(message.id)
      toast.success("Message deleted")
    } catch (err) {
      toast.error(describeMessageError(err))
      if (messageErrorCode(err) === "channel_archived") onChannelArchived()
    }
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

  const editor = showEditor && (
    <MessageEditor
      initialValue={decodeMentions(message.body, names)}
      measure={(text) => encode(text).length}
      allowEmpty={message.file_ids.length > 0}
      align={own ? "end" : "start"}
      onSave={saveEdit}
      onCancel={() => setEditing(false)}
      describeError={describeMessageError}
    />
  )

  const toolbar = !isDeleted && !showEditor && (
    <div
      className={cn(
        "absolute z-10 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border bg-surface shadow-sm group-hover/msg:flex",
        own ? "top-1/2 right-full mr-1.5" : "top-0 right-3",
      )}
    >
      {canEdit && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Edit message"
          onClick={() => setEditing(true)}
        >
          <Pencil />
        </Button>
      )}
      {canDelete && (
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

        {showEditor ? (
          <div className="w-full max-w-[75%]">{editor}</div>
        ) : isDeleted ? (
          <p className="rounded-lg border border-dashed px-3 py-1.5 text-sm italic text-muted-foreground">
            This message was deleted.
          </p>
        ) : (
          <div className="relative max-w-[75%]">
            <div
              className={cn(
                "rounded-lg bg-accent px-3 py-1.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground",
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

        {message.status !== "sent" && !showEditor && <div className="mt-0.5 px-1">{status}</div>}
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
        ) : showEditor ? (
          editor
        ) : (
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
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
