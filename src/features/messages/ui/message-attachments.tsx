import { useRef, useState } from "react"
import { Download, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { canPreview, FilePreviewDialog, formatFileSize } from "@/features/files"

import { useAttachmentUrls } from "../hooks/use-attachment-urls"
import type { Attachment, LocalMessage } from "../types"
import { isInlineImage, isInlineVideo } from "../utils/attachments"
import { ImageGrid } from "./image-grid"
import { ImageLightbox } from "./image-lightbox"

/**
 * A message's files: its images as a grid that opens a preview, its videos as players, then the
 * other files as cards that open a preview (PDF, Markdown, text, …) or download.
 */
export function MessageAttachments({ message }: { message: LocalMessage }) {
  // A pending message has no id on the server yet: its files show without links.
  const sent = message.status === "sent"
  const { urls, freshUrl, reload } = useAttachmentUrls(message.id, sent && message.file_ids.length > 0)
  // An image that failed to load gets one new URL (it may have expired), not a loop.
  const reloaded = useRef(new Set<string>())
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null)

  if (message.attachments.length === 0) return null

  const images = message.attachments.filter((a) => isInlineImage(a.mime))
  const videos = message.attachments.filter((a) => isInlineVideo(a.mime))
  const files = message.attachments.filter((a) => !isInlineImage(a.mime) && !isInlineVideo(a.mime))
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
      {videos.map((video) => (
        <div key={video.file_id} className="flex w-full max-w-md flex-col gap-1">
          {urlOf[video.file_id] && (
            <video
              src={urlOf[video.file_id]}
              controls
              preload="metadata"
              aria-label={video.filename}
              onError={() => onImageError(video.file_id)}
              className="max-h-80 w-full rounded-md bg-black"
            />
          )}
          <FileCard
            attachment={video}
            onDownload={urlOf[video.file_id] ? () => void download(video.file_id) : undefined}
          />
        </div>
      ))}
      {files.length > 0 && (
        <ul aria-label="Files" className="flex flex-col items-start gap-1.5">
          {files.map((file) => {
            const ready = !!urlOf[file.file_id]
            return (
              <li key={file.file_id}>
                <FileCard
                  attachment={file}
                  onOpen={ready && canPreview(file) ? () => setPreviewFile(file) : undefined}
                  onDownload={ready ? () => void download(file.file_id) : undefined}
                />
              </li>
            )
          })}
        </ul>
      )}
      <FilePreviewDialog
        file={previewFile}
        getUrl={freshUrl}
        onDownload={(fileId) => void download(fileId)}
        onClose={() => setPreviewFile(null)}
      />
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

type FileCardProps = {
  attachment: Attachment
  /** Shows the file in a preview; without it, the card downloads the file. */
  onOpen?: () => void
  onDownload?: () => void
}

/** A file of a message: its name and size. Opens a preview when there is one, else downloads. */
function FileCard({ attachment, onOpen, onDownload }: FileCardProps) {
  const action = onOpen ?? onDownload
  return (
    <div className="flex w-56 items-center rounded-md border bg-surface text-sm">
      <button
        type="button"
        disabled={!action}
        onClick={action}
        aria-label={`${onOpen ? "Open" : "Download"} ${attachment.filename}`}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors enabled:hover:bg-surface-hover disabled:cursor-default"
      >
        <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{attachment.filename}</span>
          <span className="block text-xs text-muted-foreground">{formatFileSize(attachment.size)}</span>
        </span>
        {!onOpen && onDownload && (
          <Download className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </button>
      {onOpen && onDownload && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Download ${attachment.filename}`}
          className="mr-1 shrink-0"
          onClick={onDownload}
        >
          <Download />
        </Button>
      )}
    </div>
  )
}
