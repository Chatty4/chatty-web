import { useState } from "react"
import {
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  RotateCcw,
  SmilePlus,
  Trash2,
} from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmojiPickerButton } from "@/components/ui/emoji-picker"
import { useConfirm } from "@/hooks/use-confirm"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

import { usePinToggle } from "../hooks/use-pin-toggle"
import { useReactionToggle } from "../hooks/use-reaction-toggle"
import type { LocalMessage } from "../types"
import { describeMessageError, messageErrorCode } from "../utils/errors"
import { MARKDOWN_BLOCK_CLASS } from "../utils/markdown"
import { decodeMentions, encodeMentions, extractMentionIds } from "../utils/mentions"
import { MessageEditor } from "./message-editor"
import { MessageMarkdown } from "./message-markdown"
import { PinnedMark } from "./pinned-mark"
import { ReactionChips } from "./reaction-chips"

/** jumpToMessage sets data-flash on the row for a moment. */
const ROW_FLASH_CLASS = "rounded-md transition-colors duration-200 data-[flash]:bg-accent/60"

/** Rows take focus so the toolbar also opens from the keyboard and with a tap. */
const ROW_FOCUS_CLASS = "outline-none focus-visible:ring-2 focus-visible:ring-ring"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
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
  /** From canReact: a sent message in a channel I can write in. */
  canReact: boolean
  /** Adds or removes my reaction. Rejects with ApiError on failure. */
  onSetReaction: (messageId: string, emoji: string, on: boolean) => Promise<void>
  /** From canPin: a sent message in a channel I can write in. */
  canPin: boolean
  /** Pins or unpins. Rejects with ApiError on failure. */
  onSetPinned: (messageId: string, on: boolean) => Promise<void>
  /** Rejects with ApiError on failure. */
  onEdit:(messageId: string, body: string) => Promise<void>
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
  canReact,
  onSetReaction,
  canPin,
  onSetPinned,
  onEdit,
  onDelete,
  onRetry,
  onChannelArchived,
}: MessageItemProps) {
  const [editing, setEditing] = useState(false)
  // The picker's popover is outside this row, so hover can't keep the toolbar open.
  const [pickingReaction, setPickingReaction] = useState(false)
  const { confirm, confirmProps } = useConfirm()
  const { busy, change: changeReaction } = useReactionToggle({
    setReaction: (emoji, on) => onSetReaction(message.id, emoji, on),
    onChannelArchived,
  })
  const { busyId: pinBusyId, toggle: togglePin } = usePinToggle({
    setPinned: onSetPinned,
    onChannelArchived,
  })

  const isDeleted = message.deleted_at !== null
  const isEdited = message.edited_at !== null && !isDeleted
  const isPinned = message.pinned && !isDeleted
  // Close the editor if the message gets deleted (e.g. from another tab) while open.
  const showEditor = editing && !isDeleted

  const candidates = Object.entries(names).map(([id, display_name]) => ({ id, display_name }))
  // Keeps the people already mentioned when two share a name.
  const existingMentions = extractMentionIds(message.body).flatMap((id) =>
    names[id] ? [{ id, display_name: names[id] }] : [],
  )
  const encode = (text: string) => encodeMentions(text, candidates, existingMentions)

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
        "absolute z-10 -translate-y-1/2 items-center gap-0.5 rounded-md border bg-surface shadow-sm",
        pickingReaction ? "flex" : "hidden group-hover/msg:flex group-focus-within/msg:flex",
        own ? "top-1/2 right-full mr-1.5" : "top-1/2 left-full ml-1.5",
        // A wide bubble leaves no room beside it on a phone, so sit on its top edge there.
        "max-sm:inset-auto max-sm:top-0 max-sm:right-0 max-sm:mx-0",
      )}
    >
      {canReact && (
        <EmojiPickerButton
          label="Add reaction"
          icon={<SmilePlus />}
          onOpenChange={setPickingReaction}
          onSelect={(emoji) => void changeReaction(emoji, true)}
        />
      )}
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
      {canPin && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={isPinned ? "Unpin message" : "Pin message"}
          disabled={!!pinBusyId}
          onClick={() => void togglePin(message.id, !isPinned)}
        >
          {isPinned ? <PinOff /> : <Pin />}
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

  const reactions = !isDeleted && (
    <ReactionChips
      reactions={message.reactions}
      busy={busy}
      canReact={canReact}
      align={own ? "end" : "start"}
      onToggle={(reaction) => void changeReaction(reaction.emoji, !reaction.me)}
    />
  )

  if (own) {
    return (
      <article
        className={cn(
          "group/msg relative flex flex-col items-end px-4 py-0.5",
          ROW_FLASH_CLASS,
          ROW_FOCUS_CLASS,
          grouped ? "mt-0" : "mt-3",
        )}
        tabIndex={0}
        data-message-id={message.id}
      >
        <ConfirmDialog {...confirmProps} />
        {(!grouped || isPinned) && (
          <div className="mb-1 flex items-baseline gap-2 px-1">
            {isPinned && <PinnedMark />}
            {!grouped && time}
          </div>
        )}

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
                "rounded-lg bg-accent px-3 py-1.5 text-sm leading-relaxed break-words text-foreground",
                MARKDOWN_BLOCK_CLASS,
                !grouped && "rounded-tr-sm",
                message.status === "pending" && "opacity-70",
                message.status === "failed" && "ring-1 ring-destructive/50",
              )}
            >
              <MessageMarkdown body={message.body} own names={names} />
              {isEdited && <span className="ml-1 text-xs text-muted-foreground">(edited)</span>}
            </div>
            {toolbar}
          </div>
        )}

        {reactions}
        {message.status !== "sent" && !showEditor && <div className="mt-0.5 px-1">{status}</div>}
      </article>
    )
  }

  return (
    <article
      className={cn(
        "group/msg relative flex gap-2.5 px-4 py-0.5",
        ROW_FLASH_CLASS,
        ROW_FOCUS_CLASS,
        grouped ? "mt-0" : "mt-3",
      )}
      tabIndex={0}
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
            {isPinned && <PinnedMark />}
          </div>
        )}
        {grouped && isPinned && (
          <div className="mb-0.5">
            <PinnedMark />
          </div>
        )}

        {isDeleted ? (
          <p className="w-fit max-w-[75%] rounded-lg border border-dashed px-3 py-1.5 text-sm italic text-muted-foreground">
            This message was deleted.
          </p>
        ) : showEditor ? (
          editor
        ) : (
          <div className="relative w-fit max-w-[75%]">
            <div
              className={cn(
                "rounded-lg bg-surface-hover px-3 py-1.5 text-sm leading-relaxed break-words text-foreground",
                MARKDOWN_BLOCK_CLASS,
                !grouped && "rounded-tl-sm",
              )}
            >
              <MessageMarkdown body={message.body} own={false} names={names} />
              {isEdited && <span className="ml-1 text-xs text-muted-foreground">(edited)</span>}
              {message.status !== "sent" && <span className="ml-1">{status}</span>}
            </div>
            {toolbar}
          </div>
        )}
        {reactions}
      </div>
    </article>
  )
}
