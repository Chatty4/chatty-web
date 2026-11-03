import { Toast } from "@base-ui/react/toast"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = Toast.useToastManager()

  return (
    <Toast.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[360px] flex-col gap-2 outline-none">
      {toasts.map((toast) => (
        <Toast.Root
          key={toast.id}
          toast={toast}
          className={cn(
            "relative flex min-h-[52px] w-full items-start gap-3 rounded-md border bg-popover px-4 py-3 shadow-[0_8px_24px_var(--shadow)] outline-none",
            "data-[ending]:animate-out data-[ending]:fade-out data-[ending]:slide-out-to-right-4 data-[ending]:duration-200",
            "data-[starting]:animate-in data-[starting]:fade-in data-[starting]:slide-in-from-right-4 data-[starting]:duration-200",
            toast.type === "error" && "border-destructive/40 bg-destructive/5",
          )}
        >
          <div className="min-w-0 flex-1">
            {toast.title && (
              <Toast.Title className="text-[13px] font-medium text-foreground">
                {toast.title}
              </Toast.Title>
            )}
            {toast.description && (
              <Toast.Description className="mt-0.5 text-[12px] text-muted-foreground">
                {toast.description}
              </Toast.Description>
            )}
          </div>
          <Toast.Close
            aria-label="Dismiss"
            className="mt-0.5 shrink-0 rounded-sm p-0.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3.5" />
          </Toast.Close>
        </Toast.Root>
      ))}
    </Toast.Viewport>
  )
}
