import { Toaster as Sonner } from "sonner"

import { useTheme } from "@/hooks/use-theme"

export function Toaster() {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "rounded-md border border-border bg-popover text-foreground shadow-[0_8px_24px_var(--shadow)] text-[13px]",
          title: "font-medium",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-surface text-muted-foreground",
        },
      }}
    />
  )
}
