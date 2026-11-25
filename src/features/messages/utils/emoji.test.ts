import { describe, expect, it } from "vitest"

import { isSingleEmoji } from "./emoji"

describe("isSingleEmoji", () => {
  it.each([
    ["👍", "a plain emoji"],
    ["👍🏽", "an emoji with a skin tone"],
    ["👨‍👩‍👧", "emoji joined into one"],
    ["🇷🇴", "a flag"],
    ["❤️", "a symbol drawn as an emoji"],
    ["1️⃣", "a keycap"],
    ["  🎉 \n", "an emoji with spaces around it"],
  ])("is true for %s (%s)", (body) => {
    expect(isSingleEmoji(body)).toBe(true)
  })

  it.each([
    ["", "an empty body"],
    ["👍👍", "two emoji"],
    ["nice 👍", "text and an emoji"],
    ["a", "a letter"],
    ["1", "a digit"],
    ["©", "a symbol shown as text"],
    ["<@3f2b6c1e-8d4a-4b7e-9c1d-2a5f6e7b8c9d>", "a mention"],
  ])("is false for %s (%s)", (body) => {
    expect(isSingleEmoji(body)).toBe(false)
  })
})
