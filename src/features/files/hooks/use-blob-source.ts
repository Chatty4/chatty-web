import { useEffect, useRef } from "react"

/**
 * Shows a blob in an <img>, <audio> or <video>: put the returned ref on the element. The
 * `blob:` URL lives while the element shows this blob, and is freed afterwards.
 */
export function useBlobSource<T extends HTMLImageElement | HTMLMediaElement>(blob: Blob) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const url = URL.createObjectURL(blob)
    if (ref.current) ref.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [blob])

  return ref
}
