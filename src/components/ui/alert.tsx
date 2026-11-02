import type { ComponentProps } from "react"
import { CircleAlert } from "lucide-react"

import { cn } from "@/lib/utils"

/** A form-level error. role="alert" makes screen readers announce it when it appears. */
function Alert({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(
        "flex items-start gap-2 rounded-sm bg-destructive-soft px-3 py-2.5 text-[13px] text-destructive",
        className,
      )}
      {...props}
    >
      <CircleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export { Alert }
