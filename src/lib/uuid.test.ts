import { describe, expect, it, vi } from "vitest"

import { uuid } from "./uuid"

describe("uuid", () => {
  it("makes a valid v4 UUID", () => {
    expect(uuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it("works without crypto.randomUUID, as over plain http", () => {
    vi.spyOn(crypto, "randomUUID").mockImplementation(() => {
      throw new Error("not a secure context")
    })
    expect(() => uuid()).not.toThrow()
    vi.restoreAllMocks()
  })
})
