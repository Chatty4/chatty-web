import type { ReactNode } from "react"

type PagePlaceholderProps = {
  title: string
  children?: ReactNode
}

/** Shown by every screen that isn't built yet. */
export function PagePlaceholder({ title, children }: PagePlaceholderProps) {
  return (
    <section className="flex flex-col gap-1">
      <h1 className="text-xl font-semibold tracking-[-0.02em]">{title}</h1>
      <p className="text-muted-foreground">Coming soon.</p>
      {children}
    </section>
  )
}
