// Light or dark theme, per device. The choice is stored in localStorage; without one, the
// system preference wins. The theme is the "dark" class on <html> (see index.css).

export type Theme = "light" | "dark"

const STORAGE_KEY = "theme"
const listeners = new Set<() => void>()

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === "light" || value === "dark" ? value : null
  } catch {
    return null // storage blocked (private mode, browser settings)
  }
}

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

let current: Theme = storedTheme() ?? systemTheme()

function apply(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark")
}

/** Call once before the first render, so the page doesn't flash the wrong theme. */
export function initTheme(): void {
  apply(current)
}

export function getTheme(): Theme {
  return current
}

export function setTheme(theme: Theme): void {
  current = theme
  apply(theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // the theme still applies to this page
  }
  listeners.forEach((listener) => listener())
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
