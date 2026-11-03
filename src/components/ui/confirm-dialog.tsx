import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Button } from "./button"

export type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  /** Label for the confirm button (default: "Confirm"). */
  action?: string
  /** When true, the confirm button uses the destructive variant. */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * A modal confirmation dialog built on @base-ui/react AlertDialog.
 * Use the `useConfirm` hook for an imperative API instead of managing state directly.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  action = "Confirm",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 transition-opacity duration-150" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-surface p-6 shadow-xl outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 transition-[transform,opacity] duration-150">
          <AlertDialog.Title className="mb-1.5 text-base font-semibold text-foreground">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mb-6 text-sm text-muted-foreground">
            {description}
          </AlertDialog.Description>
          <div className="flex justify-end gap-2">
            <AlertDialog.Close
              render={
                <Button variant="secondary" onClick={onCancel}>
                  Cancel
                </Button>
              }
            />
            <Button
              variant={destructive ? "destructive" : "default"}
              onClick={onConfirm}
            >
              {action}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
