import { useEffect, useState } from "react"

import { getFileBlobApi } from "../fetchers/file-fetchers"

// One download per file for the whole tab: an avatar shows in many places. A file never
// changes (a new avatar is a new file), so a cached image never goes stale.
// shortcut: object URLs are never revoked; fine for avatars and icons, revisit if this caches
// many large images.
const cache = new Map<string, Promise<string | null>>()

function loadImage(fileId: string): Promise<string | null> {
  let image = cache.get(fileId)
  if (!image) {
    image = getFileBlobApi(fileId).then(
      (blob) => URL.createObjectURL(blob),
      () => {
        cache.delete(fileId) // try again next time
        return null
      },
    )
    cache.set(fileId, image)
  }
  return image
}

/**
 * An avatar or team icon (GET /files/{id}) as a URL for <img src>. Undefined while it loads,
 * when there is no file, or when it can't be loaded.
 */
export function useFileImage(fileId: string | null | undefined): string | undefined {
  const [loaded, setLoaded] = useState<{ fileId: string; url: string | null }>()

  useEffect(() => {
    if (!fileId) return
    let cancelled = false
    void loadImage(fileId).then((url) => {
      if (!cancelled) setLoaded({ fileId, url })
    })
    return () => {
      cancelled = true
    }
  }, [fileId])

  return loaded && loaded.fileId === fileId ? (loaded.url ?? undefined) : undefined
}
