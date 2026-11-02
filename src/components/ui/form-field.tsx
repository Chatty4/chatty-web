import { useId, type ReactNode } from "react"

import { cn } from "@/lib/utils"

type ControlProps = {
  id: string
  "aria-invalid": boolean | undefined
  "aria-describedby": string | undefined
}

type FormFieldProps = {
  label: string
  /** Shown under the control and announced by screen readers. */
  error?: string
  /** Shown under the control while there is no error. */
  hint?: string
  className?: string
  /** Receives the props that link the control to its label, hint and error. */
  children: (control: ControlProps) => ReactNode
}

/** A label, one control, and its hint or error, linked for assistive technology. */
function FormField({ label, error, hint, className, children }: FormFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint

  return (
    <div data-slot="form-field" className={cn("flex flex-col gap-[7px]", className)}>
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": message ? messageId : undefined,
      })}
      {message && (
        <span
          id={messageId}
          className={cn("text-[11px]", error ? "text-destructive" : "text-muted-foreground")}
        >
          {message}
        </span>
      )}
    </div>
  )
}

export { FormField }
