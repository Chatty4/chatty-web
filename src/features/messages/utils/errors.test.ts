import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api"

import { describeSendFailure } from "./errors"

describe("describeSendFailure", () => {
  it("gives the reason and no retry when the server refused the message", () => {
    expect(describeSendFailure(new ApiError(409, "channel_archived", "Conflict"))).toEqual({
      message: "This channel is archived and read-only.",
      retryable: false,
    })
  })

  it.each([0, 429, 500, 503])("allows a retry after status %i", (status) => {
    expect(describeSendFailure(new ApiError(status, "x", "x")).retryable).toBe(true)
  })

  it("allows a retry after an unknown error", () => {
    expect(describeSendFailure(new Error("boom")).retryable).toBe(true)
  })
})
