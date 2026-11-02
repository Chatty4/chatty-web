import type { FormEventHandler, ReactNode } from "react"

import { BrandMark } from "@/components/app/brand-mark"

type AuthCardProps = {
  title: string
  description: string
  onSubmit: FormEventHandler<HTMLFormElement>
  children: ReactNode
  footer?: ReactNode
}

/** The card the login and register forms sit in. */
export function AuthCard({ title, description, onSubmit, children, footer }: AuthCardProps) {
  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-labelledby="auth-card-title"
      className="flex w-full max-w-[420px] flex-col gap-[18px] rounded-md border bg-surface p-[18px] shadow-[0_8px_28px_var(--shadow)] sm:p-7"
    >
      <div className="flex items-center gap-2.5 text-base font-semibold">
        <BrandMark />
        Chatty
      </div>
      <div className="flex flex-col gap-1">
        <h1 id="auth-card-title" className="text-xl font-semibold tracking-[-0.02em]">
          {title}
        </h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {children}
      {footer && <p className="text-center text-xs text-muted-foreground">{footer}</p>}
    </form>
  )
}
