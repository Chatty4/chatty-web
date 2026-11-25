import { formatFileSize } from "../../utils/format"
import { TEXT_PREVIEW_MAX_BYTES } from "../../utils/preview"

/** Under a preview that only shows the start of a big file; `shown` says how much. */
export function TruncatedNote({ shown = formatFileSize(TEXT_PREVIEW_MAX_BYTES) }: { shown?: string }) {
  return (
    <p className="mt-3 text-xs text-muted-foreground">
      Showing the first {shown}. Download the file to see all of it.
    </p>
  )
}
