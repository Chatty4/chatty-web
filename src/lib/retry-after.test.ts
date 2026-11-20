import { describe, expect, it } from "vitest"

import { secondsUntil, waitText } from "./retry-after"

describe("secondsUntil", () => {
  it.each([
    [30_000, 30],
    [29_001, 30], // rounded up: never shows 0 while there is still a wait
    [1, 1],
    [0, 0],
    [-5_000, 0],
  ])("is the whole seconds left, %i ms before", (left, seconds) => {
    expect(secondsUntil(1_000_000 + left, 1_000_000)).toBe(seconds)
  })
})

describe("waitText", () => {
  it.each([
    [1, "1 second"],
    [12, "12 seconds"],
    [59, "59 seconds"],
    [60, "a minute"],
    [61, "2 minutes"],
    [180, "3 minutes"],
  ])("says %i s as %s", (seconds, text) => {
    expect(waitText(seconds)).toBe(text)
  })

  it.each([undefined, 0])("says a few minutes without a Retry-After (%s)", (seconds) => {
    expect(waitText(seconds)).toBe("a few minutes")
  })
})
