import { useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

import { useElementWidth } from "../../hooks/use-element-width"
import { PDF_PREVIEW_MAX_PAGES } from "../../utils/preview"
import { TruncatedNote } from "./truncated-note"
import type { ViewerProps } from "./types"

// Bundled with the app: no worker from a CDN. Set here, where the PDF components are used.
pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString()

// Pages fit the window, up to a readable width.
const MAX_PAGE_WIDTH = 900

/** A PDF's pages, with selectable text and working links. */
export function PdfViewer({ blob }: ViewerProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [pages, setPages] = useState(0)
  const [error, setError] = useState<Error>()
  // A file pdf.js can't read goes to the preview's error boundary, like any viewer's failure.
  if (error) throw error

  const shown = Math.min(pages, PDF_PREVIEW_MAX_PAGES)
  const pageWidth = Math.min(width, MAX_PAGE_WIDTH)

  return (
    <div ref={ref} className="min-h-full bg-surface-subtle p-4">
      <Document
        file={blob}
        onLoadSuccess={(pdf) => setPages(pdf.numPages)}
        onLoadError={setError}
        loading={null}
        externalLinkTarget="_blank"
        externalLinkRel="noopener noreferrer nofollow"
        className="flex flex-col items-center gap-4"
      >
        {pageWidth > 0 &&
          Array.from({ length: shown }, (_, i) => (
            <Page
              key={i}
              pageNumber={i + 1}
              width={pageWidth}
              loading={null}
              className="bg-white shadow-sm"
            />
          ))}
      </Document>
      {pages > shown && <TruncatedNote shown={`${shown} of ${pages} pages`} />}
    </div>
  )
}
