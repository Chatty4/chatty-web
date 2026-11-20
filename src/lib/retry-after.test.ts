import { describe, expect, it } from "vitest"

import { waitText } from "./retry-after"

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
