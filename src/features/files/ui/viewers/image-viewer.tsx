import { useBlobSource } from "../../hooks/use-blob-source"
import type { ViewerProps } from "./types"

/** Pictures the message doesn't show inline, such as SVG. An <img> never runs an SVG's scripts. */
export function ImageViewer({ blob, filename }: ViewerProps) {
  const ref = useBlobSource<HTMLImageElement>(blob)

  return (
    <div className="grid min-h-full place-items-center p-4">
      <img ref={ref} alt={filename} className="max-h-full max-w-full object-contain" />
    </div>
  )
}
