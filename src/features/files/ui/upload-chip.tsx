import { AlertCircle, FileText, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { FileUpload } from "../hooks/use-file-uploads"
import { formatFileSize } from "../utils/format"
import { VIDEO_MIMES } from "../utils/limits"

/** One picked file in the composer: name, size, progress or error, and a remove button. */
export function UploadChip({ upload, onRemove }: { upload: FileUpload; onRemove: () => void }) {
  const failed = upload.status === "failed"
  return (
    <div
      className={cn(
        "relative flex w-56 items-center gap-2 overflow-hidden rounded-md border bg-surface px-2 py-1.5 text-sm",
        failed && "border-destructive",
      )}
    >
      {failed ? (
        <AlertCircle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
      ) : upload.preview && VIDEO_MIMES.includes(upload.file.type) ? (
        <video src={upload.preview} muted preload="metadata" className="size-9 shrink-0 rounded-sm bg-black object-cover" />
      ) : upload.preview ? (
        <img src={upload.preview} alt="" className="size-9 shrink-0 rounded-sm object-cover" />
      ) : (
        <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{upload.file.name}</p>
        <p className={cn("truncate text-xs", failed ? "text-destructive" : "text-muted-foreground")}>
          {failed
            ? upload.error
            : upload.status === "uploading"
              ? `Uploading… ${Math.round(upload.progress * 100)}%`
              : formatFileSize(upload.file.size)}
        </p>
      </div>
      <Button variant="ghost" size="icon-sm" aria-label={`Remove ${upload.file.name}`} onClick={onRemove}>
        <X />
      </Button>
      {upload.status === "uploading" && (
        <div
          role="progressbar"
          aria-label={`Uploading ${upload.file.name}`}
          aria-valuenow={Math.round(upload.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="absolute inset-x-0 bottom-0 h-0.5 bg-accent"
        >
          <div className="h-full bg-primary transition-[width]" style={{ width: `${upload.progress * 100}%` }} />
        </div>
      )}
    </div>
  )
}
