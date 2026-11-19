import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { Attachment } from "../types"

type ImageLightboxProps = {
  images: Attachment[]
  /** The image shown; null when closed. */
  index: number | null
  /** Download URLs by file_id; an image without one shows its name. */
  urls: Record<string, string | undefined>
  onIndexChange: (index: number) => void
  onClose: () => void
  onDownload: (fileId: string) => void
  onImageError: (fileId: string) => void
}

/** Full-screen preview of a message's images, with ← → to go through them. */
export function ImageLightbox({
  images,
  index,
  urls,
  onIndexChange,
  onClose,
  onDownload,
  onImageError,
}: ImageLightboxProps) {
  const image = index === null ? undefined : images[index]
  const count = images.length
  // Wraps around, so the arrows never dead-end.
  const go = (step: number) => index !== null && onIndexChange((index + step + count) % count)
  const url = image && urls[image.file_id]

  return (
    <DialogPrimitive.Root open={image !== undefined} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[70] bg-black/85 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DialogPrimitive.Popup
          className="fixed inset-0 z-[71] flex flex-col text-white outline-none"
          onKeyDown={(e) => {
            if (count < 2) return
            if (e.key === "ArrowLeft") go(-1)
            if (e.key === "ArrowRight") go(1)
          }}
        >
          {image && (
            <>
              {/* Top bar */}
              <div className="flex shrink-0 items-center gap-3 bg-black/50 px-4 py-2.5">
                <div className="flex min-w-0 flex-1 flex-col">
                  <DialogPrimitive.Title className="truncate text-sm font-semibold">
                    {image.filename}
                  </DialogPrimitive.Title>
                  {count > 1 && (
                    <span className="text-xs text-white/70">
                      {index! + 1} of {count}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/15 hover:text-white"
                  disabled={!url}
                  onClick={() => onDownload(image.file_id)}
                >
                  <Download /> Download
                </Button>
                <DialogPrimitive.Close
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Close preview"
                      className="text-white hover:bg-white/15 hover:text-white"
                    >
                      <X className="size-[18px]" />
                    </Button>
                  }
                />
              </div>

              {/* Image; a click beside it closes, like the backdrop. */}
              <div
                className="relative flex min-h-0 flex-1 items-center justify-center p-4 sm:px-16"
                onClick={(e) => e.target === e.currentTarget && onClose()}
              >
                {url ? (
                  <img
                    key={image.file_id}
                    src={url}
                    alt={image.filename}
                    className="max-h-full max-w-full object-contain"
                    onError={() => onImageError(image.file_id)}
                  />
                ) : (
                  <span className="text-sm text-white/70">Loading {image.filename}…</span>
                )}

                {count > 1 && (
                  <>
                    <ArrowButton side="left" onClick={() => go(-1)} />
                    <ArrowButton side="right" onClick={() => go(1)} />
                  </>
                )}
              </div>
            </>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function ArrowButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous image" : "Next image"}
      onClick={onClick}
      className={`absolute top-1/2 ${side === "left" ? "left-3" : "right-3"} grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none`}
    >
      <Icon className="size-6" />
    </button>
  )
}
