import { describe, expect, it } from "vitest"

import { createSyncGate } from "./sync-gate"

/** A promise the test resolves or rejects by hand. */
function deferred() {
  let resolve!: () => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function setup() {
  const delivered: number[] = []
  return { delivered, gate: createSyncGate<number>((n) => delivered.push(n)) }
}

describe("createSyncGate", () => {
  it("delivers straight away when no sync is running", () => {
    const { gate, delivered } = setup()
    gate.receive(1)
    expect(delivered).toEqual([1])
  })

  it("holds messages during a sync and releases them in order after it", async () => {
    const { gate, delivered } = setup()
    const sync = deferred()

    const run = gate.run(() => sync.promise)
    gate.receive(1)
    gate.receive(2)
    expect(delivered).toEqual([])

    sync.resolve()
    await run
    expect(delivered).toEqual([1, 2])

    gate.receive(3)
    expect(delivered).toEqual([1, 2, 3])
  })

  it("applies the sync before releasing held messages", async () => {
    const { gate, delivered } = setup()
    const run = gate.run(async () => {
      gate.receive(2)
      delivered.push(1)
    })
    await run
    expect(delivered).toEqual([1, 2])
  })

  it("still releases held messages when the sync fails", async () => {
    const { gate, delivered } = setup()
    const sync = deferred()

    const run = gate.run(() => sync.promise)
    gate.receive(1)
    sync.reject(new Error("offline"))
    await run

    expect(delivered).toEqual([1])
  })

  it("stays closed until the newest of two overlapping syncs finishes", async () => {
    const { gate, delivered } = setup()
    const first = deferred()
    const second = deferred()

    const firstRun = gate.run(() => first.promise)
    gate.receive(1)
    const secondRun = gate.run(() => second.promise)
    gate.receive(2)

    first.resolve()
    await firstRun
    expect(delivered).toEqual([])

    second.resolve()
    await secondRun
    expect(delivered).toEqual([1, 2])
  })
})
