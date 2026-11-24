import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api-error"

import { describeTeamError } from "./errors"

describe("describeTeamError", () => {
  it("tells the last owner how to leave", () => {
    const error = new ApiError(409, "last_owner", "Conflict")
    expect(describeTeamError(error)).toBe(
      "You're the only owner. Make someone else owner first, or delete the team.",
    )
  })

  it("says when the server can't be reached", () => {
    expect(describeTeamError(new ApiError(0, "network_error", "offline"))).toContain(
      "can't be reached",
    )
  })

  it("has a general message for the rest", () => {
    expect(describeTeamError(new ApiError(400, "something_new", "Bad request"))).toBe(
      "Something went wrong. Try again.",
    )
  })
})
