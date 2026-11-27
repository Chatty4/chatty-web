import { FileText, Film, Music } from "lucide-react"

import { mediaKind } from "../utils/media"

/** A film for video, a note for sound, a page for everything else. */
export function FileIcon({
  file,
  className,
}: {
  file: { mime: string; filename: string }
  className?: string
}) {
  const kind = mediaKind(file)
  if (kind === "video") return <Film className={className} aria-hidden="true" />
  if (kind === "audio") return <Music className={className} aria-hidden="true" />
  return <FileText className={className} aria-hidden="true" />
}
