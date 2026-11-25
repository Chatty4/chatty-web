import { useEffect, useState } from "react"

import { TEXT_PREVIEW_MAX_BYTES } from "../utils/preview"

export type BlobText = { text: string; truncated: boolean }

/** The start of a text file, up to TEXT_PREVIEW_MAX_BYTES. Undefined while it is read. */
export function useBlobText(blob: Blob): BlobText | undefined {
  const [read, setRead] = useState<{ blob: Blob; value: BlobText }>()

  useEffect(() => {
    let cancelled = false
    const truncated = blob.size > TEXT_PREVIEW_MAX_BYTES
    void blob
      .slice(0, TEXT_PREVIEW_MAX_BYTES)
      .text()
      .then((text) => {
        if (!cancelled) setRead({ blob, value: { text, truncated } })
      })
    return () => {
      cancelled = true
    }
  }, [blob])

  return read?.blob === blob ? read.value : undefined
}
