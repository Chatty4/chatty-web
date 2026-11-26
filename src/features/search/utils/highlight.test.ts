import { describe, expect, it } from "vitest"

import { matchedWords, parseHighlight, showMentions } from "./highlight"

describe("parseHighlight", () => {
  it("splits marked words from the text around them", () => {
    expect(parseHighlight("<mark>deploy</mark> at 5")).toEqual([
      { text: "deploy", mark: true },
      { text: " at 5", mark: false },
    ])
  })

  it("turns escaped text back into what the user wrote, as text", () => {
    expect(parseHighlight("&lt;b&gt;hi&lt;/b&gt; &amp; <mark>x</mark> &quot;&#x27;")).toEqual([
      { text: "<b>hi</b> & ", mark: false },
      { text: "x", mark: true },
      { text: " \"'", mark: false },
    ])
  })

  it("keeps a user's escaped <mark> as text, not a highlight", () => {
    expect(parseHighlight("&lt;mark&gt;fake&lt;/mark&gt;")).toEqual([
      { text: "<mark>fake</mark>", mark: false },
    ])
  })

  it("handles several marks", () => {
    expect(parseHighlight("<mark>a</mark> b <mark>c</mark>").map((p) => p.mark)).toEqual([
      true,
      false,
      true,
    ])
  })
})

describe("matchedWords", () => {
  it("keeps only the marked words, without the labels or text around them", () => {
    expect(matchedWords("chat icon jpg, white, <mark>red</mark>, blue, icon")).toEqual(["red"])
  })

  it("lists a word once, in the order it first appears", () => {
    expect(matchedWords("<mark>Red</mark> car, <mark>blue</mark>, <mark>red</mark>")).toEqual([
      "Red",
      "blue",
    ])
  })

  it("is empty without a search (the newest files have no highlight)", () => {
    expect(matchedWords("")).toEqual([])
  })
})

describe("showMentions", () => {
  const id = "71dbb4fd-b3df-4cf2-8442-a04a5875998c"

  it("shows a mention by name", () => {
    expect(showMentions(`hi <@${id}>`, { [id]: "Ana" })).toBe("hi @Ana")
  })

  it("shows an unknown member as @unknown", () => {
    expect(showMentions(`<@${id}>`, {})).toBe("@unknown")
  })
})
