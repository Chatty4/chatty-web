import { Suspense } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Download, FileText, X } from "lucide-react"

import { Button } from "@/components/ui/button"

import { useFileBlob } from "../hooks/use-file-blob"
import { formatFileSize } from "../utils/format"
import { previewKind } from "../utils/preview"
import { PreviewErrorBoundary } from "./preview-error-boundary"
import { VIEWERS } from "./viewers/registry"

/** The file being previewed: what a message's attachment has. */
export type PreviewFile = { file_id: string; filename: string; mime: string; size: number }

type FilePreviewDialogProps = {
  /** The file shown; null when closed. */
  file: PreviewFile | null
  /** A download URL that works now: the file is fetched with it and shown in the page. */
  getUrl: (fileId: string) => Promise<string | undefined>
  onDownload: (fileId: string) => void
  onClose: () => void
}

/** A large window that shows a file (PDF, Markdown, text, …) without downloading it. */
export function FilePreviewDialog({ file, getUrl, onDownload, onClose }: FilePreviewDialogProps) {
  return (
    <DialogPrimitive.Root open={file !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[70] bg-black/60 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DialogPrimitive.Popup className="fixed inset-2 z-[71] mx-auto flex max-w-5xl flex-col overflow-hidden rounded-md border bg-surface shadow-xl outline-none transition-[transform,opacity] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 sm:inset-6">
          {file && (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b py-2 pr-2 pl-4">
                <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <DialogPrimitive.Title className="truncate text-sm font-semibold">
                    {file.filename}
                  </DialogPrimitive.Title>
                  <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                </div>
                <Button variant="ghost" size="icon" aria-label="Download" onClick={() => onDownload(file.file_id)}>
                  <Download />
                </Button>
                <DialogPrimitive.Close
                  render={
                    <Button variant="ghost" size="icon" aria-label="Close preview">
                      <X />
                    </Button>
                  }
                />
              </div>
              <div className="min-h-0 flex-1 overflow-auto bg-surface">
                <PreviewBody
                  key={file.file_id}
                  file={file}
                  getUrl={() => getUrl(file.file_id)}
                  onDownload={() => onDownload(file.file_id)}
                />
              </div>
            </>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

type PreviewBodyProps = {
  file: PreviewFile
  getUrl: () => Promise<string | undefined>
  onDownload: () => void
}

function PreviewBody({ file, getUrl, onDownload }: PreviewBodyProps) {
  const state = useFileBlob(file.file_id, getUrl)
  const kind = previewKind(file)
  const Viewer = kind ? VIEWERS[kind] : undefined
  const failed = <PreviewMessage text="Couldn't show this file." onDownload={onDownload} />

  if (!Viewer) return <PreviewMessage text="This file can't be shown here." onDownload={onDownload} />
  if (state.status === "failed") return failed
  if (state.status === "loading") return <PreviewLoading />
  return (
    <PreviewErrorBoundary fallback={failed}>
      <Suspense fallback={<PreviewLoading />}>
        <Viewer blob={state.blob} filename={file.filename} />
      </Suspense>
    </PreviewErrorBoundary>
  )
}

function PreviewLoading() {
  return (
    <div role="status" className="grid min-h-full place-items-center p-6 text-sm text-muted-foreground">
      Loading preview…
    </div>
  )
}

function PreviewMessage({ text, onDownload }: { text: string; onDownload: () => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button variant="secondary" size="sm" onClick={onDownload}>
        <Download /> Download
      </Button>
    </div>
  )
}
