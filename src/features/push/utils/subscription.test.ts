import { describe, expect, it } from "vitest"

import { base64UrlToBytes, isSameKey, pushStatus, toSaveInput } from "./subscription"

describe("base64UrlToBytes", () => {
  it("decodes base64url without padding, - and _ included", () => {
    // 0xfb 0xff 0xbf is "-_-_" in base64url ("+/+/" in plain base64)
    expect([...base64UrlToBytes("-_-_")]).toEqual([0xfb, 0xff, 0xbf])
  })

  it("adds the padding the key in .env leaves out", () => {
    expect([...base64UrlToBytes("AQI")]).toEqual([1, 2])
    expect([...base64UrlToBytes("AQ")]).toEqual([1])
  })

  it("gives the 65 bytes of an uncompressed P-256 public key", () => {
    const key = "B" + "A".repeat(86) // 87 chars, like VAPID_PUBLIC_KEY
    const bytes = base64UrlToBytes(key)
    expect(bytes.length).toBe(65)
    expect(bytes[0]).toBe(4)
  })
})

describe("isSameKey", () => {
  const key = new Uint8Array([4, 1, 2])

  it("matches the same bytes", () => {
    expect(isSameKey(new Uint8Array([4, 1, 2]).buffer, key)).toBe(true)
  })

  it("rejects another key, another length or no key", () => {
    expect(isSameKey(new Uint8Array([4, 1, 3]).buffer, key)).toBe(false)
    expect(isSameKey(new Uint8Array([4, 1]).buffer, key)).toBe(false)
    expect(isSameKey(null, key)).toBe(false)
  })
})

describe("toSaveInput", () => {
  it("flattens the keys into the contract body", () => {
    const json = { endpoint: "https://push.example.test/1", keys: { p256dh: "pk", auth: "au" } }
    expect(toSaveInput(json)).toEqual({ endpoint: "https://push.example.test/1", p256dh: "pk", auth: "au" })
  })

  it("throws on a subscription without keys", () => {
    expect(() => toSaveInput({ endpoint: "https://push.example.test/1" })).toThrow()
    expect(() => toSaveInput({ keys: { p256dh: "pk", auth: "au" } })).toThrow()
  })
})

describe("pushStatus", () => {
  it.each([
    ["granted", true, "on"],
    ["granted", false, "off"],
    ["default", false, "off"],
    ["default", true, "off"], // a leftover subscription without permission can't show anything
    ["denied", true, "blocked"],
    ["denied", false, "blocked"],
  ] as const)("permission %s, subscribed %s: %s", (permission, subscribed, expected) => {
    expect(pushStatus(permission, subscribed)).toBe(expected)
  })
})
