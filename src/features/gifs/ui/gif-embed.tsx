/** A GIF message: the GIPHY image itself, at a fixed height so the list doesn't jump. */
export function GifEmbed({ url }: { url: string }) {
  return (
    <img
      src={url.trim()}
      alt="GIF"
      loading="lazy"
      className="h-48 w-auto max-w-full rounded-md object-contain"
    />
  )
}
