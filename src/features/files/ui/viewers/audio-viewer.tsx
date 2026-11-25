import { FileAudio } from "lucide-react"

import { useBlobSource } from "../../hooks/use-blob-source"
import type { ViewerProps } from "./types"

/** A player for sound files. */
export function AudioViewer({ blob, filename }: ViewerProps) {
  const ref = useBlobSource<HTMLAudioElement>(blob)

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6">
      <FileAudio className="size-12 text-muted-foreground" aria-hidden="true" />
      <audio ref={ref} controls aria-label={filename} className="w-full max-w-md" />
    </div>
  )
}
