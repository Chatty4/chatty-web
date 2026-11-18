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

  it("asks to attach again when a file can't be sent, without a retry", () => {
    expect(describeSendFailure(new ApiError(400, "invalid_file", "File f1 can't be sent"))).toEqual({
      message: "A file can't be sent. Attach it again.",
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
