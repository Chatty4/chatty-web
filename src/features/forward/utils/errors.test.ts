import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api"

import { describeForwardFailure } from "./errors"

const NOW = 1_000_000

describe("describeForwardFailure", () => {
  it("says a deleted message can't be forwarded, with no retry", () => {
    expect(describeForwardFailure(new ApiError(404, "message_not_found", "gone"))).toEqual({
      message: "This message can't be forwarded anymore.",
      retryable: false,
    })
  })

  it("shows the generic error for another team", () => {
    expect(describeForwardFailure(new ApiError(400, "forward_wrong_team", "no"))).toEqual({
      message: "Something went wrong. Try again.",
      retryable: false,
    })
  })

  it("keeps the wait of a rate limit, with a retry", () => {
    const error = new ApiError(429, "rate_limited", "slow down", { retryAfter: 3 })
    expect(describeForwardFailure(error, NOW)).toEqual({
      message: "Not sent: too many messages.",
      retryable: true,
      retryAt: NOW + 3000,
    })
  })
})
