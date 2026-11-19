import { useFileImage } from "@/features/files"
import { cn } from "@/lib/utils"

/**
 * A team's icon (GET /files/{id}), or the first letter of its name when there is none.
 * `className` sets the tile's size, shape and letter colors.
 */
export function TeamIcon({
  name,
  iconFileId,
  className,
}: {
  name: string
  iconFileId: string | null
  className?: string
}) {
  const src = useFileImage(iconFileId)
  return (
    <span aria-hidden="true" className={cn("grid shrink-0 place-items-center overflow-hidden", className)}>
      {src ? <img src={src} alt="" className="size-full object-cover" /> : name.slice(0, 1).toUpperCase()}
    </span>
  )
}
