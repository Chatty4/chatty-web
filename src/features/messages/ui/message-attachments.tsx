import { useRef, useState } from "react"
import { Download, FileText } from "lucide-react"

import { formatFileSize } from "@/features/files"

import { useAttachmentUrls } from "../hooks/use-attachment-urls"
import type { Attachment, LocalMessage } from "../types"
import { isInlineImage } from "../utils/attachments"
import { ImageGrid } from "./image-grid"
import { ImageLightbox } from "./image-lightbox"

/** A message's files: its images as a grid that opens a preview, then the other files as cards. */
export function MessageAttachments({ message }: { message: LocalMessage }) {
  // A pending message has no id on the server yet: its files show without links.
  const sent = message.status === "sent"
  const { urls, freshUrl, reload } = useAttachmentUrls(message.id, sent && message.file_ids.length > 0)
  // An image that failed to load gets one new URL (it may have expired), not a loop.
  const reloaded = useRef(new Set<string>())
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  if (message.attachments.length === 0) return null

  const images = message.attachments.filter((a) => isInlineImage(a.mime))
  const files = message.attachments.filter((a) => !isInlineImage(a.mime))
  const urlOf = Object.fromEntries(message.attachments.map((a) => [a.file_id, urls[a.file_id]?.url]))

  // The URL answers with Content-Disposition: attachment, so this downloads under the file's name.
  const download = async (fileId: string) => {
    const url = await freshUrl(fileId)
    if (url) window.location.assign(url)
  }

  const onImageError = (fileId: string) => {
    if (reloaded.current.has(fileId)) return
    reloaded.current.add(fileId)
    void reload()
  }

  return (
    // Inside the bubble; the bubble's [&>*+*] rule spaces it from the text.
    <div className="flex flex-col items-start gap-1.5">
      <ImageGrid images={images} urls={urlOf} onOpen={setPreviewIndex} onImageError={onImageError} />
      {files.length > 0 && (
        <ul aria-label="Files" className="flex flex-col items-start gap-1.5">
          {files.map((file) => (
            <li key={file.file_id}>
              <FileCard
                attachment={file}
                onDownload={urlOf[file.file_id] ? () => void download(file.file_id) : undefined}
              />
            </li>
          ))}
        </ul>
      )}
      <ImageLightbox
        images={images}
        index={previewIndex}
        urls={urlOf}
        onIndexChange={setPreviewIndex}
        onClose={() => setPreviewIndex(null)}
        onDownload={(fileId) => void download(fileId)}
        onImageError={onImageError}
      />
    </div>
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
