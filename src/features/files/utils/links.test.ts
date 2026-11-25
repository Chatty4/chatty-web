import { describe, expect, it } from "vitest"

import { isSafeHref } from "./links"

describe("isSafeHref", () => {
  it("allows web and mail links", () => {
    expect(isSafeHref("https://example.com/a")).toBe(true)
    expect(isSafeHref("http://example.com")).toBe(true)
    expect(isSafeHref("mailto:a@example.com")).toBe(true)
  })

  it("refuses script, file and relative links", () => {
    expect(isSafeHref("javascript:alert(1)")).toBe(false)
    expect(isSafeHref(" JavaScript:alert(1)")).toBe(false)
    expect(isSafeHref("file:///C:/secret.txt")).toBe(false)
    expect(isSafeHref("data:text/html,hi")).toBe(false)
    expect(isSafeHref("/teams")).toBe(false)
  })
})
