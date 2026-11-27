import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import type { ReactElement, ReactNode } from "react"

type TooltipProps = {
  /** The text shown; for an icon-only button, the same as its aria-label. */
  label: string
  /** The trigger: one element that takes a ref, such as a Button. */
  children: ReactElement
  side?: "top" | "bottom" | "left" | "right"
}

/** A short label on hover and keyboard focus. Touch screens don't show it. */
export function Tooltip({ label, children, side = "top" }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={6} className="z-[80]">
          <TooltipPrimitive.Popup className="origin-[var(--transform-origin)] rounded-sm border bg-popover px-2 py-1 text-xs font-medium whitespace-nowrap text-foreground shadow-[0_8px_24px_var(--shadow)] transition-[transform,opacity] duration-100 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            {label}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

/**
 * Around a group of tooltips, like a toolbar: after the first one opens, the next opens at once
 * while the pointer moves along the group.
 */
export function TooltipGroup({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delay={400} timeout={300}>
      {children}
    </TooltipPrimitive.Provider>
  )
}
