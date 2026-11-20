import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api-error"

import { describeSearchError } from "./errors"

describe("describeSearchError", () => {
  it("says how long to wait after too many searches", () => {
    const error = new ApiError(429, "rate_limited", "Too many requests", { retryAfter: 20 })

    expect(describeSearchError(error)).toBe("Too many searches. Try again in 20 seconds.")
    expect(describeSearchError(error, true)).toBe("Too many searches. Try again in 20 seconds.")
  })

  it.each([new ApiError(503, "core_unavailable", "down"), new Error("offline")])(
    "keeps the general text for other failures (%s)",
    (error) => {
      expect(describeSearchError(error)).toBe("Couldn't search.")
      expect(describeSearchError(error, true)).toBe("Couldn't load more results.")
    },
  )
})
