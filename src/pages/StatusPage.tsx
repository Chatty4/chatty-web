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
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Backend status</h1>
      <ul className="space-y-1 text-sm">
        {services.map((service) => {
          const result = results[service]
          return (
            <li key={service}>
              <span className="inline-block w-24 font-medium">chatty-{service}</span>
              {!result && "checking…"}
              {result?.ok && <code>{JSON.stringify(result.health)}</code>}
              {result && !result.ok && <span className="text-destructive">{result.error}</span>}
            </li>
          )
        })}
      </ul>
      <Button variant="outline" onClick={() => setRound((n) => n + 1)}>
        Check again
      </Button>
    </section>
  )
}
