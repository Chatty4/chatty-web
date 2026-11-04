import { describe, expect, it } from "vitest"

import { parseInviteCode } from "./invite-code"

describe("parseInviteCode", () => {
  it("reads a bare code", () => {
    expect(parseInviteCode(" aB3xK9pQ ")).toBe("aB3xK9pQ")
  })

  it("reads the code from a link", () => {
    expect(parseInviteCode("https://chatty.example/invite/aB3xK9pQ?x=1")).toBe("aB3xK9pQ")
    expect(parseInviteCode("localhost:5173/invite/aB3xK9pQ/")).toBe("aB3xK9pQ")
  })

  it("is null for anything else", () => {
    expect(parseInviteCode("")).toBeNull()
    expect(parseInviteCode("not a code")).toBeNull()
    expect(parseInviteCode("https://evil.example/login")).toBeNull()
    expect(parseInviteCode("https://chatty.example/invite/")).toBeNull()
  })
})
