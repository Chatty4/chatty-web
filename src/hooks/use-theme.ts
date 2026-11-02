import { useSyncExternalStore } from "react"

import { getTheme, setTheme, subscribeTheme } from "@/lib/theme"

export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme)
  return {
    theme,
    toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
  }
}
