import { Check, CheckCheck } from "lucide-react"

import { cn } from "@/lib/utils"

import { receiptLabel } from "../store/receipts"
import type { Receipt } from "../types"

/** ✓ sent, ✓✓ grey seen by some, ✓✓ coloured seen by everyone. Read out by screen readers. */
export function ReadTicks({ receipt, className }: { receipt: Receipt; className?: string }) {
  const label = receiptLabel(receipt)
  const Icon = receipt.status === "sent" ? Check : CheckCheck
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex align-middle",
        receipt.status === "all" ? "text-read-receipt" : "text-faint-foreground",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
    </span>
  )
}
