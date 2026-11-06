import { useSyncExternalStore } from "react"

function subscribe(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange)
  return () => document.removeEventListener("visibilitychange", onChange)
}

const isVisible = () => document.visibilityState === "visible"

/** True while this browser tab is the one on screen. */
export function useTabVisible(): boolean {
  return useSyncExternalStore(subscribe, isVisible)
}
