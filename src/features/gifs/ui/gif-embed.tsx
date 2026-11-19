import { cn } from "@/lib/utils"

/**
 * A GIF message: the GIPHY image itself, at a fixed height so the list doesn't jump.
 * `className` sets another height, e.g. a smaller one in pins and search results.
 */
export function GifEmbed({ url, className = "h-48" }: { url: string; className?: string }) {
  return (
    <img
      src={url.trim()}
      alt="GIF"
      loading="lazy"
      className={cn("w-auto max-w-full rounded-md object-contain", className)}
    />
  )
}
