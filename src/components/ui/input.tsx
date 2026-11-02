import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[38px] w-full min-w-0 rounded-sm border border-input bg-surface px-2.5 text-sm text-foreground transition-[border-color,box-shadow] outline-none placeholder:text-faint-foreground",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive-soft",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
