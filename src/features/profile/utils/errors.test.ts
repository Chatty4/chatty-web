import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api-error"

import { describePasswordError } from "./errors"

describe("describePasswordError", () => {
  it("reads the code, not the message, which is only 'Bad request'", () => {
    const error = new ApiError(400, "wrong_password", "Bad request")
    expect(describePasswordError(error)).toBe("Current password is incorrect.")
  })

  it("has a general message for the rest", () => {
    expect(describePasswordError(new Error("boom"))).toContain("Could not change password")
  })
})
