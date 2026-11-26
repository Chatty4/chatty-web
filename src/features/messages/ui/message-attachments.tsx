import { useRef, useState } from "react"
import { Download, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { canPreview, FilePreviewDialog, formatFileSize, isAudioFile } from "@/features/files"

import { useAttachmentUrls } from "../hooks/use-attachment-urls"
import type { Attachment, LocalMessage } from "../types"
import { isInlineImage, isInlineVideo } from "../utils/attachments"
import { ImageGrid } from "./image-grid"
import { ImageLightbox } from "./image-lightbox"

/**
 * A message's files: its images as a grid that opens a preview, its videos and sounds as players, then
 * the other files as cards that open a preview (PDF, Markdown, text, …) or download.
 */
export function MessageAttachments({ message }: { message: LocalMessage }) {
  // A pending message has no id on the server yet: its files show without links.
  const sent = message.status === "sent"
  const { urls, freshUrl, reload } = useAttachmentUrls(message.id, sent && message.file_ids.length > 0)
  // An image that failed to load gets one new URL (it may have expired), not a loop.
  const reloaded = useRef(new Set<string>())
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null)
  // Sounds and videos the browser can't play (a codec it lacks, such as Dolby): only their card is left.
  const [unplayable, setUnplayable] = useState<ReadonlySet<string>>(new Set())

  if (message.attachments.length === 0) return null

  const images = message.attachments.filter((a) => isInlineImage(a.mime))
  const videos = message.attachments.filter((a) => isInlineVideo(a.mime))
  const audios = message.attachments.filter((a) => isAudioFile(a))
  const files = message.attachments.filter(
    (a) => !isInlineImage(a.mime) && !isInlineVideo(a.mime) && !isAudioFile(a),
  )
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

  // An error may be an expired URL, so the first one gets a new URL; a second means it can't play.
  const onMediaError = (fileId: string) => {
    if (!reloaded.current.has(fileId)) return onImageError(fileId)
    setUnplayable((ids) => new Set(ids).add(fileId))
  }
  const playable = (fileId: string) => !!urlOf[fileId] && !unplayable.has(fileId)

  // Under a player, only the name and a download button; a file that can't play keeps its card.
  const caption = (attachment: Attachment) =>
    playable(attachment.file_id) ? (
      <FileLine attachment={attachment} onDownload={() => void download(attachment.file_id)} />
    ) : (
      <FileCard
        attachment={attachment}
        onDownload={urlOf[attachment.file_id] ? () => void download(attachment.file_id) : undefined}
      />
    )

  return (
    // Inside the bubble; the bubble's [&>*+*] rule spaces it from the text.
    <div className="flex flex-col items-start gap-1.5">
      <ImageGrid images={images} urls={urlOf} onOpen={setPreviewIndex} onImageError={onImageError} />
      {videos.map((video) => (
        <div key={video.file_id} className="flex w-full max-w-md flex-col gap-1">
          {playable(video.file_id) && (
            <video
              src={urlOf[video.file_id]}
              controls
              preload="metadata"
              aria-label={video.filename}
              onError={() => onMediaError(video.file_id)}
              className="max-h-80 w-full rounded-md bg-black"
            />
          )}
          {caption(video)}
        </div>
      ))}
      {audios.map((audio) => (
        // Wide enough for the player's volume slider to open; never wider than the bubble.
        <div key={audio.file_id} className="flex w-80 max-w-full flex-col gap-1">
          {playable(audio.file_id) && (
            <audio
              src={urlOf[audio.file_id]}
              controls
              preload="metadata"
              aria-label={audio.filename}
              onError={() => onMediaError(audio.file_id)}
              className="w-full"
            />
          )}
          {caption(audio)}
        </div>
      ))}
      {files.length > 0 && (
        // max-w-full down to the card: in a narrow chat a card shrinks with the bubble, not past it.
        <ul aria-label="Files" className="flex max-w-full flex-col items-start gap-1.5">
          {files.map((file) => {
            const ready = !!urlOf[file.file_id]
            return (
              <li key={file.file_id} className="max-w-full">
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

type FileLineProps = { attachment: Attachment; onDownload: () => void }

/** A player's file: its name and size in one quiet line, and a download button. */
function FileLine({ attachment, onDownload }: FileLineProps) {
  return (
    <div className="flex w-full min-w-0 items-center gap-1 pl-1 text-xs text-muted-foreground">
      <span className="min-w-0 truncate" title={attachment.filename}>
        {attachment.filename}
      </span>
      <span className="shrink-0">· {formatFileSize(attachment.size)}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Download ${attachment.filename}`}
        className="ml-auto shrink-0"
        onClick={onDownload}
      >
        <Download />
      </Button>
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
    <div className="flex w-56 max-w-full items-center rounded-md border bg-surface text-sm">
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
