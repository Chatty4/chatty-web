import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "./button"

type DialogProps = {
  open: boolean
  title: string
  description?: string
  /** Called on Escape, backdrop click or the close button. */
  onClose: () => void
  children: ReactNode
}

export function Dialog({ open, title, description, onClose, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[70] bg-black/40 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-[71] flex max-h-[min(760px,calc(100vh-40px))] w-[min(480px,calc(100vw-40px))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-md border bg-surface shadow-xl outline-none transition-[transform,opacity] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <div className="flex min-h-[66px] shrink-0 items-center justify-between border-b py-2.5 pr-3 pl-[18px]">
            <div className="flex min-w-0 flex-col">
              <DialogPrimitive.Title className="text-[15px] font-semibold">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-xs text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              render={
                <Button variant="ghost" size="icon" aria-label="Close dialog">
                  <X className="size-[17px]" />
                </Button>
              }
            />
          </div>
          <div className="min-h-0 overflow-y-auto p-[18px]">{children}</div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
