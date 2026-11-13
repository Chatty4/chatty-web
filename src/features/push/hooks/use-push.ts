import { useCallback, useEffect, useState } from "react"

import { useAuth } from "@/features/auth"

import { disablePush, enablePush, readPushStatus } from "../push"
import type { PushStatus } from "../types"

/** This browser's push status, with turn on / turn off for the settings page. */
export function usePush() {
  const [status, setStatus] = useState<PushStatus | "loading">("loading")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    void readPushStatus().then((next) => {
      if (active) setStatus(next)
    })
    return () => {
      active = false
    }
  }, [])

  const run = useCallback(async (action: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await action()
    } finally {
      setStatus(await readPushStatus())
      setBusy(false)
    }
  }, [])

  const userId = useAuth().user?.id ?? ""
  const turnOn = useCallback(() => run(() => enablePush(userId)), [run, userId])
  const turnOff = useCallback(() => run(disablePush), [run])

  return { status, busy, turnOn, turnOff }
}
