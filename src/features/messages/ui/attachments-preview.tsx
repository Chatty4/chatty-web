import { FileText, Image as ImageIcon, Video } from "lucide-react"

import { useAttachmentUrls } from "../hooks/use-attachment-urls"
import type { ApiMessage } from "../types"
import { isInlineImage, isInlineVideo } from "../utils/attachments"

const SHOWN = 2

/**
 * A short look at a message's files, for places with little room like a pin card: the first two
 * (an image or video as a thumbnail, another file by name), then "+N" for the rest.
 */
export function AttachmentsPreview({ message }: { message: ApiMessage }) {
  const hasFiles = message.attachments.length > 0
  const { urls } = useAttachmentUrls(message.id, hasFiles)
  if (!hasFiles) return null

  const shown = message.attachments.slice(0, SHOWN)
  const rest = message.attachments.length - shown.length

  return (
    <ul aria-label="Files" className="flex items-center gap-1.5">
      {shown.map((file) => {
        const url = urls[file.file_id]?.url
        return isInlineVideo(file.mime) ? (
          <li key={file.file_id} className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-sm bg-surface-hover">
            {url ? (
              // Metadata only: the browser shows the first frame without loading the whole video.
              <video src={url} muted preload="metadata" aria-label={file.filename} className="size-full object-cover" />
            ) : (
              <Video className="size-5 text-muted-foreground" aria-label={file.filename} />
            )}
          </li>
        ) : isInlineImage(file.mime) ? (
          <li key={file.file_id} className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-sm bg-surface-hover">
            {url ? (
              <img src={url} alt={file.filename} loading="lazy" className="size-full object-cover" />
            ) : (
              <ImageIcon className="size-5 text-muted-foreground" aria-label={file.filename} />
            )}
          </li>
        ) : (
          <li
            key={file.file_id}
            className="flex h-14 min-w-0 max-w-32 items-center gap-1.5 rounded-sm bg-surface-hover px-2 text-xs"
          >
            <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{file.filename}</span>
          </li>
        )
      })}
      {rest > 0 && (
        <li
          className="grid h-14 min-w-14 shrink-0 place-items-center rounded-sm bg-surface-hover px-2 text-sm font-semibold text-muted-foreground"
          aria-label={`${rest} more file${rest === 1 ? "" : "s"}`}
        >
          +{rest}
        </li>
      )}
    </ul>
  )
}
