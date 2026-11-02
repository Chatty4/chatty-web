import type { ReactNode } from "react"

import { BrandMark } from "./brand-mark"

type FullScreenMessageProps = {
  title: string
  description?: string
  children?: ReactNode
}

/** A centered message over the whole page: loading, or a backend that can't be reached. */
export function FullScreenMessage({ title, description, children }: FullScreenMessageProps) {
  return (
    <main className="grid min-h-full place-items-center bg-background p-6">
      <div role="status" className="flex max-w-sm flex-col items-center gap-3 text-center">
        <BrandMark />
        <div className="flex flex-col gap-1">
          <strong className="text-base font-semibold">{title}</strong>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {children}
      </div>
    </main>
  )
}
