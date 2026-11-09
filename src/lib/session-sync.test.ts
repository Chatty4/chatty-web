import { describe, expect, it } from "vitest"

import { sharedTokenAction } from "./session-sync"

describe("sharedTokenAction", () => {
  it("adopts a refresh of this tab's own login", () => {
    expect(sharedTokenAction("login-a", "login-a")).toBe("adopt")
  })

  it("adopts a login when this tab is logged out", () => {
    expect(sharedTokenAction(null, "login-b")).toBe("adopt")
  })

  it("reloads when another tab logged in as someone else", () => {
    // without the reload, this tab keeps showing user A's data with user B's token
    expect(sharedTokenAction("login-a", "login-b")).toBe("reload")
  })
})
