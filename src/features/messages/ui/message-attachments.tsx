import { useRef } from "react"
import { Download, FileText } from "lucide-react"

import { formatFileSize } from "@/features/files"
import { cn } from "@/lib/utils"

import { useAttachmentUrls } from "../hooks/use-attachment-urls"
import type { Attachment, LocalMessage } from "../types"
import { isInlineImage } from "../utils/attachments"

/** A message's files in the sent order: images inline, other files as cards. */
export function MessageAttachments({ message, align }: { message: LocalMessage; align: "start" | "end" }) {
  // A pending message has no id on the server yet: its files show without links.
  const sent = message.status === "sent"
  const { urls, freshUrl, reload } = useAttachmentUrls(message.id, sent && message.file_ids.length > 0)
  // An image that failed to load gets one new URL (it may have expired), not a loop.
  const reloaded = useRef(new Set<string>())

  if (message.attachments.length === 0) return null

  // The URL answers with Content-Disposition: attachment, so this downloads under the file's name.
  const download = async (fileId: string) => {
    const url = await freshUrl(fileId)
    if (url) window.location.assign(url)
  }

  return (
    <ul
      aria-label="Files"
      className={cn("mt-1 flex max-w-[75%] flex-wrap gap-2", align === "end" && "justify-end")}
    >
      {message.attachments.map((attachment) => {
        const url = urls[attachment.file_id]?.url
        return (
          <li key={attachment.file_id}>
            {url && isInlineImage(attachment.mime) ? (
              <button
                type="button"
                className="block overflow-hidden rounded-md border"
                aria-label={`Download ${attachment.filename}`}
                onClick={() => void download(attachment.file_id)}
              >
                <img
                  src={url}
                  alt={attachment.filename}
                  loading="lazy"
                  className="max-h-60 max-w-xs object-contain"
                  onError={() => {
                    if (reloaded.current.has(attachment.file_id)) return
                    reloaded.current.add(attachment.file_id)
                    void reload()
                  }}
                />
              </button>
            ) : (
              <FileCard
                attachment={attachment}
                onDownload={url ? () => void download(attachment.file_id) : undefined}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}

function FileCard({ attachment, onDownload }: { attachment: Attachment; onDownload?: () => void }) {
  return (
    <button
      type="button"
      disabled={!onDownload}
      onClick={onDownload}
      aria-label={`Download ${attachment.filename}`}
      className="flex w-56 items-center gap-2 rounded-md border bg-surface px-2 py-1.5 text-left text-sm transition-colors enabled:hover:bg-surface-hover disabled:cursor-default"
    >
      <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{attachment.filename}</span>
        <span className="block text-xs text-muted-foreground">{formatFileSize(attachment.size)}</span>
      </span>
      {onDownload && <Download className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </button>
  )
}
