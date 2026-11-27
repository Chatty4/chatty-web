import { useState, type ReactNode } from "react"
import { Music } from "lucide-react"

import { useFileUrl } from "../hooks/use-file-url"
import { revealUnknownDuration, type MediaKind } from "../utils/media"

type MediaPreviewProps = {
  kind: MediaKind
  fileId: string
  filename: string
  getUrl: () => Promise<string | undefined>
  /** Shown while the URL is on its way. */
  loading: ReactNode
  /** Shown when there is no URL, or the browser can't play the file (a codec it lacks). */
  failed: ReactNode
}

/**
 * Plays a sound or a video in the preview window, streamed from its download URL: unlike the
 * other previews, the file isn't downloaded whole first. Starts at once, since opening it was
 * the click that asked for it.
 */
export function MediaPreview({ kind, fileId, filename, getUrl, loading, failed }: MediaPreviewProps) {
  const state = useFileUrl(fileId, getUrl)
  const [unplayable, setUnplayable] = useState(false)

  if (state.status === "failed" || unplayable) return failed
  if (state.status === "loading") return loading

  const player = {
    src: state.url,
    controls: true,
    autoPlay: true,
    preload: "metadata",
    "aria-label": filename,
    onLoadedMetadata: (event: { currentTarget: HTMLMediaElement }) =>
      revealUnknownDuration(event.currentTarget),
    onError: () => setUnplayable(true),
  } as const

  if (kind === "video") {
    return (
      <div className="flex min-h-full items-center justify-center bg-black p-2">
        <video {...player} className="max-h-[calc(100vh-9rem)] max-w-full" />
      </div>
    )
  }
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6">
      <span className="grid size-20 place-items-center rounded-full bg-accent">
        <Music className="size-9 text-primary" aria-hidden="true" />
      </span>
      <audio {...player} className="w-full max-w-md" />
    </div>
  )
}
