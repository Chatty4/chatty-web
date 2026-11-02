import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/use-theme"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}
      onClick={toggleTheme}
    >
      {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </Button>
  )
}
