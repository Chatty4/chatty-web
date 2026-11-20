import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-error"

import { backoffDelay, reconnectDelay, retryAfterMs, retryWithBackoff } from "./backoff"

describe("retryAfterMs", () => {
  it("is a 429's Retry-After in ms", () => {
    expect(retryAfterMs(new ApiError(429, "rate_limited", "x", { retryAfter: 7 }))).toBe(7_000)
  })

  it.each([new ApiError(503, "down", "x"), new Error("boom")])("is 0 for %s", (error) => {
    expect(retryAfterMs(error)).toBe(0)
  })
})

describe("backoffDelay", () => {
  it("doubles the cap up to 30 s", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999999)
    expect(backoffDelay(0)).toBeCloseTo(1_000, 0)
    expect(backoffDelay(3)).toBeCloseTo(8_000, 0)
    expect(backoffDelay(20)).toBeCloseTo(30_000, 0)
    vi.restoreAllMocks()
  })
})

describe("reconnectDelay", () => {
  it.each([4001, 4002])("reconnects right away after %i", (code) => {
    expect(reconnectDelay(code, 0)).toBe(0)
  })

  it.each([4001, 4002])("backs off when %i keeps coming back", (code) => {
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    expect(reconnectDelay(code, 2)).toBe(2_000)
    vi.restoreAllMocks()
  })

  it.each([1001, 1006, 1009, 1011, 1012, 4008])("backs off after %i", (code) => {
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    expect(reconnectDelay(code, 2)).toBe(2_000)
    vi.restoreAllMocks()
  })
})

describe("retryWithBackoff", () => {
  const wait = () => Promise.resolve()

  it("returns the first success", async () => {
    const task = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue("ok")
    await expect(retryWithBackoff(task, { shouldRetry: () => true, wait })).resolves.toBe("ok")
    expect(task).toHaveBeenCalledTimes(2)
  })

  it("gives up after the allowed attempts with the last error", async () => {
    const task = vi.fn().mockRejectedValue(new Error("down"))
    await expect(retryWithBackoff(task, { attempts: 3, shouldRetry: () => true, wait })).rejects.toThrow("down")
    expect(task).toHaveBeenCalledTimes(3)
  })

  it("does not retry a failure that retrying can't fix", async () => {
    const task = vi.fn().mockRejectedValue(new Error("bad request"))
    await expect(retryWithBackoff(task, { shouldRetry: () => false, wait })).rejects.toThrow()
    expect(task).toHaveBeenCalledTimes(1)
  })

  it("waits at least a 429's Retry-After before trying again", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    const waits: number[] = []
    const task = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(429, "rate_limited", "slow down", { retryAfter: 12 }))
      .mockResolvedValue("ok")

    await retryWithBackoff(task, {
      shouldRetry: () => true,
      wait: async (ms) => void waits.push(ms),
    })

    expect(waits).toEqual([12_000]) // not the 500 ms backoff
    vi.restoreAllMocks()
  })

  it("stops when cancelled", async () => {
    const task = vi.fn().mockRejectedValue(new Error("down"))
    await expect(
      retryWithBackoff(task, { shouldRetry: () => true, isCancelled: () => true, wait }),
    ).rejects.toThrow()
    expect(task).toHaveBeenCalledTimes(1)
  })
})
