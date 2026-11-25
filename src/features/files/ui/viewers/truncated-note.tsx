import { formatFileSize } from "../../utils/format"
import { TEXT_PREVIEW_MAX_BYTES } from "../../utils/preview"

/** Under a text preview that only shows the start of a big file. */
export function TruncatedNote() {
  return (
    <p className="mt-3 text-xs text-muted-foreground">
      Showing the first {formatFileSize(TEXT_PREVIEW_MAX_BYTES)}. Download the file to see all of it.
    </p>
  )
}
