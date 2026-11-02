import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { ApiError, getHealth, type HealthResponse, type ServiceName } from "@/lib/api"

type Result = { ok: true; health: HealthResponse } | { ok: false; error: string }

const services: ServiceName[] = ["core", "chat"]

async function check(service: ServiceName, signal: AbortSignal): Promise<Result> {
  try {
    return { ok: true, health: await getHealth(service, signal) }
  } catch (error) {
    const message = error instanceof ApiError ? `${error.status} ${error.code}` : "failed"
    return { ok: false, error: message }
  }
}

/** Calls each backend's /health through the dev proxy (or Nginx) to check the wiring. */
export function StatusPage() {
  const [results, setResults] = useState<Partial<Record<ServiceName, Result>>>({})
  const [round, setRound] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    for (const service of services) {
      check(service, controller.signal).then((result) => {
        if (!controller.signal.aborted) {
          setResults((current) => ({ ...current, [service]: result }))
        }
      })
    }
    return () => controller.abort()
  }, [round])

  return (
    <section className="flex w-full max-w-[520px] flex-col gap-4 rounded-md border bg-surface p-7">
      <h1 className="text-xl font-semibold tracking-[-0.02em]">Backend status</h1>
      <ul className="flex flex-col gap-1 text-sm">
        {services.map((service) => {
          const result = results[service]
          return (
            <li key={service} className="flex gap-2">
              <span className="w-24 shrink-0 font-medium">chatty-{service}</span>
              {!result && <span className="text-muted-foreground">checking…</span>}
              {result?.ok && <code className="break-all">{JSON.stringify(result.health)}</code>}
              {result && !result.ok && <span className="text-destructive">{result.error}</span>}
            </li>
          )
        })}
      </ul>
      <Button
        variant="outline"
        className="self-start"
        onClick={() => {
          setResults({})
          setRound((n) => n + 1)
        }}
      >
        Check again
      </Button>
    </section>
  )
}
