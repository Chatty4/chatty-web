import { describe, expect, it } from "vitest"

import { emoticonBefore, replaceEmoticon, typedEmoticon } from "./emoticons"

describe("emoticonBefore", () => {
  it.each([
    [":)", "😃"],
    ["=)", "😃"],
    [":-D", "😄"],
    [";)", "😉"],
    [":'(", "😢"],
    ["<3", "❤️"],
    ["xD", "😆"],
    [">:(", "😠"],
    ["B-)", "😎"],
  ])("finds %s as %s", (emoticon, emoji) => {
    const text = `ok ${emoticon}`
    expect(emoticonBefore(text, text.length)).toEqual({ start: 3, end: text.length, emoticon, emoji })
  })

  it("finds one at the start of the text or of a line", () => {
    expect(emoticonBefore(":)", 2)?.emoji).toBe("😃")
    expect(emoticonBefore("hi\n:(", 5)?.emoji).toBe("😦")
  })

  it.each([
    ["a:)", "glued to a word"],
    ["http://", "part of a link"],
    ["(8)", "not an emoticon"],
    ["8)", "a list marker"],
    ["B)", "a list marker"],
    ["x)", "a list marker"],
    ["8D", "a term, as in 8D audio"],
    ["x3", "times three"],
    [":3", "a cat face the list maps to a man"],
    [":-", "a colon in text"],
    ["`:)", "inside inline code"],
    ["```\n:)", "inside a code block"],
  ])("ignores %s (%s)", (text) => {
    expect(emoticonBefore(text, text.length)).toBeNull()
  })

  it("finds one after inline code or a code block has closed", () => {
    expect(emoticonBefore("`x` :)", 6)?.emoji).toBe("😃")
    expect(emoticonBefore("```\nx\n``` :)", 12)?.emoji).toBe("😃")
  })
})

describe("typedEmoticon", () => {
  it("finds the emoticon a typed space or line break finishes", () => {
    expect(typedEmoticon("ok :)", "ok :) ", 6)?.emoji).toBe("😃")
    expect(typedEmoticon(":)", ":)\n", 3)?.emoji).toBe("😃")
    expect(typedEmoticon("a :) b", "a :)  b", 5)?.emoji).toBe("😃")
  })

  it("ignores other typing, pastes and deletions", () => {
    expect(typedEmoticon("ok :", "ok :)", 5)).toBeNull()
    expect(typedEmoticon("", ":) ", 3)).toBeNull()
    expect(typedEmoticon("ok :) ", "ok :)", 5)).toBeNull()
  })
})

describe("replaceEmoticon", () => {
  it("swaps the emoticon and keeps the rest", () => {
    const text = "hi :) there"
    expect(replaceEmoticon(text, emoticonBefore(text, 5)!)).toBe("hi 😃 there")
  })
})
