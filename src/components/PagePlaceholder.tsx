import type { ReactNode } from "react"

type PagePlaceholderProps = {
  title: string
  children?: ReactNode
}

/** Shown by every screen that isn't built yet. */
export function PagePlaceholder({ title, children }: PagePlaceholderProps) {
  return (
    <section className="space-y-2">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">Coming soon.</p>
      {children}
    </section>
  )
}
