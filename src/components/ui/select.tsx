import { ChevronDown } from "lucide-react"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative flex w-full">
      <select
        data-slot="select"
        className={cn(
          "h-[34px] w-full cursor-pointer appearance-none rounded-sm border border-input bg-surface py-0 pl-2.5 pr-7 text-sm text-foreground transition-[border-color,box-shadow] outline-none",
          "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  )
}

export { Select }
