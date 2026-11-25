import { useBlobText } from "../../hooks/use-blob-text"
import { TruncatedNote } from "./truncated-note"
import type { ViewerProps } from "./types"

/** Plain text, code, logs and HTML source, as written: nothing in them runs. */
export function TextViewer({ blob, filename }: ViewerProps) {
  const read = useBlobText(blob)
  if (!read) return null

  return (
    <div className="p-4">
      <pre
        aria-label={filename}
        className="overflow-x-auto rounded-md border bg-surface-subtle p-3 font-mono text-xs leading-relaxed whitespace-pre"
      >
        {read.text}
      </pre>
      {read.truncated && <TruncatedNote />}
    </div>
  )
}
