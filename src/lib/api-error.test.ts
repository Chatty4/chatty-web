import { describe, expect, it } from "vitest"

import { ApiError, isSessionRejected, networkError } from "./api-error"

describe("isSessionRejected", () => {
  it.each([401, 403])("is true for %i", (status) => {
    expect(isSessionRejected(new ApiError(status, "x", "x"))).toBe(true)
  })

  it.each([400, 404, 429, 500, 503])("keeps the session on %i", (status) => {
    expect(isSessionRejected(new ApiError(status, "x", "x"))).toBe(false)
  })

  it("keeps the session on network and unknown errors", () => {
    expect(isSessionRejected(networkError())).toBe(false)
    expect(isSessionRejected(new Error("boom"))).toBe(false)
  })
})
