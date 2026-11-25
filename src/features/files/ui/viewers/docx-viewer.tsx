import { useEffect, useRef, useState } from "react"
import { renderAsync } from "docx-preview"

import { secureLinks } from "../../utils/links"
import type { ViewerProps } from "./types"

const OPTIONS = {
  className: "docx",
  // Embedded HTML would render in a frame, and embedded fonts load from blob: URLs the CSP refuses.
  renderAltChunks: false,
  ignoreFonts: true,
  renderComments: false,
  renderChanges: false,
}

/** A Word document (.docx) laid out as pages, drawn in the page from the file. */
export function DocxViewer({ blob }: ViewerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<unknown>()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let cancelled = false
    renderAsync(blob, el, el, OPTIONS)
      .then(() => {
        if (!cancelled) secureLinks(el)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e ?? new Error("Can't read the document"))
      })
    return () => {
      cancelled = true
      el.replaceChildren()
    }
  }, [blob])

  // A file docx-preview can't read goes to the preview's error boundary, like any viewer's failure.
  if (error) throw error

  // The library's page background is grey; the app's surface instead, in both themes. Its styles
  // are outside Tailwind's layers, so they win unless this one is important.
  return <div ref={ref} className="min-h-full [&_.docx-wrapper]:bg-surface-subtle!" />
}
