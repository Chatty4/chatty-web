import { Image as ImageIcon } from "lucide-react"

import { cn } from "@/lib/utils"

import type { Attachment } from "../types"
import { imageRows } from "../utils/attachments"

// Fixed tile heights: an image that loads later doesn't move the messages under it, so the list
// stays scrolled to the bottom. Fewer tiles in a row get taller.
const TILE_HEIGHT: Record<number, string> = { 1: "h-48", 2: "h-36", 3: "h-24" }
// Whole class names, so Tailwind finds them.
const COLUMNS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" }

type ImageGridProps = {
  images: Attachment[]
  urls: Record<string, string | undefined>
  onOpen: (index: number) => void
  onImageError: (fileId: string) => void
}

/** A message's images as one compact mosaic: a click opens the preview. */
export function ImageGrid({ images, urls, onOpen, onImageError }: ImageGridProps) {
  if (images.length === 0) return null

  // One image keeps its shape; more are cropped into the grid.
  if (images.length === 1) {
    return (
      <Tile
        image={images[0]!}
        url={urls[images[0]!.file_id]}
        className="h-48 w-auto min-w-24 max-w-xs"
        fit="contain"
        onOpen={() => onOpen(0)}
        onImageError={onImageError}
      />
    )
  }

  const rows = imageRows(images.length)
  return (
    <div className="flex w-80 max-w-full flex-col gap-1 overflow-hidden rounded-md">
      {rows.map((size, r) => {
        const offset = rows.slice(0, r).reduce((sum, n) => sum + n, 0)
        const row = images.slice(offset, offset + size)
        return (
          <div key={offset} className={cn("grid gap-1", COLUMNS[size])}>
            {row.map((image, i) => (
              <Tile
                key={image.file_id}
                image={image}
                url={urls[image.file_id]}
                className={cn("w-full rounded-none", TILE_HEIGHT[size])}
                fit="cover"
                onOpen={() => onOpen(offset + i)}
                onImageError={onImageError}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function Tile({
  image,
  url,
  className,
  fit,
  onOpen,
  onImageError,
}: {
  image: Attachment
  url: string | undefined
  className: string
  fit: "contain" | "cover"
  onOpen: () => void
  onImageError: (fileId: string) => void
}) {
  return (
    <button
      type="button"
      disabled={!url}
      aria-label={`Open ${image.filename}`}
      onClick={onOpen}
      className={cn(
        "block overflow-hidden rounded-md bg-surface transition-opacity enabled:hover:opacity-90 disabled:cursor-default",
        className,
      )}
    >
      {url ? (
        <img
          src={url}
          alt={image.filename}
          loading="lazy"
          className={cn("h-full", fit === "cover" ? "w-full object-cover" : "w-auto object-contain")}
          onError={() => onImageError(image.file_id)}
        />
      ) : (
        <span className="grid h-full w-full min-w-24 place-items-center px-2 text-xs text-muted-foreground">
          <ImageIcon className="size-6" aria-hidden="true" />
          <span className="max-w-full truncate">{image.filename}</span>
        </span>
      )}
    </button>
  )
}
