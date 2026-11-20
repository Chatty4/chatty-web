import { useEffect, useState } from "react"

import { secondsUntil } from "@/lib/retry-after"

const TICK_MS = 250 // a few ticks a second, so the number changes close to the real second

/**
 * Seconds left until `until` (epoch ms), updated while it runs; 0 once it is over or without one.
 * Mount it with `key={until}` when `until` can change, so the countdown starts over.
 */
export function useCountdown(until: number | undefined): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (until === undefined) return
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= until) clearInterval(timer)
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [until])

  return until === undefined ? 0 : secondsUntil(until, now)
}
