import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/** Multi-line input that grows with its content (CSS field-sizing) up to its max height. */
function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content min-h-[58px] w-full resize-none rounded-sm border border-input bg-surface px-2.5 py-2 text-sm leading-relaxed text-foreground transition-[border-color,box-shadow] outline-none placeholder:text-faint-foreground",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive-soft",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
