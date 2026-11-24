import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api"

import {
  describeMessageError,
  describePinError,
  describeReactionError,
  describeSendFailure,
} from "./errors"

function rateLimited(retryAfter?: number): ApiError {
  return new ApiError(429, "rate_limited", "Too many requests", { retryAfter })
}

describe("rate_limited", () => {
  it("says how long to wait, from Retry-After", () => {
    expect(describeMessageError(rateLimited(12))).toBe(
      "You're doing that too often. Try again in 12 seconds.",
    )
  })

  it("says a few minutes without Retry-After", () => {
    expect(describeMessageError(rateLimited())).toBe(
      "You're doing that too often. Try again in a few minutes.",
    )
  })

  it.each([
    ["reactions", describeReactionError],
    ["pins", describePinError],
  ])("is explained the same way for %s", (_, describe) => {
    expect(describe(rateLimited(5))).toBe("You're doing that too often. Try again in 5 seconds.")
  })
})

describe("describeReactionError", () => {
  it("explains the limit of different reactions per message", () => {
    expect(describeReactionError(new ApiError(409, "reaction_limit_reached", "Conflict"))).toBe(
      "You can add at most 20 different reactions to a message. Remove one first.",
    )
  })
})

describe("describeSendFailure", () => {
  it("allows a retry after a 429, at the time Retry-After gives", () => {
    expect(describeSendFailure(rateLimited(30), 1_000_000)).toEqual({
      message: "Not sent: too many messages.",
      retryable: true,
      retryAt: 1_030_000,
    })
  })

  it("allows a retry right away after a 429 without Retry-After", () => {
    expect(describeSendFailure(rateLimited())).toEqual({
      message: "Not sent: too many messages.",
      retryable: true,
      retryAt: undefined,
    })
  })

  it("gives the reason and no retry when the server refused the message", () => {
    expect(describeSendFailure(new ApiError(409, "channel_archived", "Conflict"))).toEqual({
      message: "This channel is archived and read-only.",
      retryable: false,
    })
  })

  it("asks to join, not 'no longer a member', when I only view the channel", () => {
    expect(describeSendFailure(new ApiError(403, "not_a_member", "Forbidden"))).toEqual({
      message: "Join the channel to send messages.",
      retryable: false,
    })
  })

  it("keeps 'no longer a member' for edits, where I did write the message", () => {
    expect(describeMessageError(new ApiError(403, "not_a_member", "Forbidden"))).toBe(
      "You are no longer a member of this channel.",
    )
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
