import { useRef, useState, type ReactNode } from "react"
import { Download, MessageSquare } from "lucide-react"

import { Button } from "@/components/ui/button"
import { canPreview, FileIcon, FilePreviewDialog, formatFileSize } from "@/features/files"
import { useAttachmentUrls } from "@/features/messages/hooks/use-attachment-urls"
import { useWhenVisible } from "@/features/messages/hooks/use-when-visible"
import { ImageLightbox } from "@/features/messages/ui/image-lightbox"
import { isInlineImage } from "@/features/messages/utils/attachments"
import { toast } from "@/lib/toast"

import type { AttachmentSearchResult } from "../types"
import { matchedWords } from "../utils/highlight"

// The thumbnail's URL is asked for a bit before the row scrolls into view. An observer with no
// root uses the viewport, and still sees the row clipped by the panel's scrolling list.
const VIEWPORT = { current: null }
const AHEAD = "200px"

export type FileResultProps = {
  result: AttachmentSearchResult
  /** Who sent it and when, in one line of phrasing content. */
  header: ReactNode
  onGoToMessage: () => void
}

/**
 * One file in a list: a thumbnail for images (loaded when the row comes into view), else an icon.
 * A click opens it: images full screen; sound, video, PDF, Word, text… in the preview; the rest
 * download.
 */
export function FileResult({ result, header, onGoToMessage }: FileResultProps) {
  const { attachment, message, highlight } = result
  const image = isInlineImage(attachment.mime)
  // The message's download URLs: for an image once its row is near the screen, else on a click.
  const [wanted, setWanted] = useState(false)
  const [open, setOpen] = useState<"image" | "preview" | null>(null)
  const retried = useRef(false)
  const { urls, freshUrl, reload } = useAttachmentUrls(message.id, wanted)
  const url = urls[attachment.file_id]?.url

  const rowRef = useWhenVisible<HTMLLIElement>({
    rootRef: VIEWPORT,
    enabled: image && !wanted,
    resetKey: attachment.file_id,
    rootMargin: AHEAD,
    onVisible: () => setWanted(true),
  })

  // The URL answers with Content-Disposition: attachment, so this downloads under the file's name.
  const download = async () => {
    const fresh = await freshUrl(attachment.file_id)
    if (fresh) window.location.assign(fresh)
    else toast.error("Couldn't download this file. Try again.")
  }

  // A failed image may be an expired URL: one new URL, not a loop.
  const onImageError = () => {
    if (retried.current) return
    retried.current = true
    void reload()
  }

  const openFile = () => {
    if (image) {
      setWanted(true)
      setOpen("image")
    } else if (canPreview(attachment)) setOpen("preview")
    else void download()
  }

  // Only the words that matched: the full labels and text are long and mostly noise here.
  const matches = matchedWords(highlight)

  return (
    <li ref={rowRef} className="rounded-md border hover:bg-surface-hover">
      <button
        type="button"
        onClick={openFile}
        aria-label={`Open ${attachment.filename}`}
        className="flex w-full items-start gap-3 rounded-md p-3 text-left focus-visible:outline-2 focus-visible:outline-ring"
      >
        {image && url ? (
          <img
            src={url}
            alt=""
            onError={onImageError}
            className="size-12 shrink-0 rounded-sm bg-muted object-cover"
          />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-sm bg-muted">
            {!image && <FileIcon file={attachment} className="size-5 text-muted-foreground" />}
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
            {header}
          </span>
          <span className="truncate text-sm font-medium" title={attachment.filename}>
            {attachment.filename}
          </span>
          <span className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</span>
          {matches.length > 0 && (
            <span className="mt-0.5 flex flex-wrap gap-1" aria-label="Matches">
              {matches.map((word) => (
                <mark
                  key={word}
                  className="max-w-full truncate rounded-sm bg-primary/20 px-1 text-xs text-foreground"
                >
                  {word}
                </mark>
              ))}
            </span>
          )}
        </span>
      </button>
      <div className="flex justify-end gap-1 px-2 pb-2">
        <Button variant="ghost" size="sm" onClick={onGoToMessage}>
          <MessageSquare /> Go to message
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Download ${attachment.filename}`}
          onClick={() => void download()}
        >
          <Download />
        </Button>
      </div>

      <ImageLightbox
        images={[attachment]}
        index={open === "image" ? 0 : null}
        urls={{ [attachment.file_id]: url }}
        onIndexChange={() => {}}
        onClose={() => setOpen(null)}
        onDownload={() => void download()}
        onImageError={onImageError}
      />
      <FilePreviewDialog
        file={open === "preview" ? attachment : null}
        getUrl={freshUrl}
        onDownload={() => void download()}
        onClose={() => setOpen(null)}
      />
    </li>
  )
}
