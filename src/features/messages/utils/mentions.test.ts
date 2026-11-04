import { describe, expect, it } from "vitest"

import { encodeMentions, findMentionQuery } from "./mentions"

const ANA = { id: "11111111-1111-1111-1111-111111111111", display_name: "Ana" }
const ANA_MARIA = { id: "22222222-2222-2222-2222-222222222222", display_name: "Ana Maria" }

describe("findMentionQuery", () => {
  it("finds a name with diacritics and spaces", () => {
    expect(findMentionQuery("hi @Ștefan", 10)).toEqual({ start: 3, query: "Ștefan" })
    expect(findMentionQuery("@Ana P", 6)).toEqual({ start: 0, query: "Ana P" })
  })

  it("works at the caret, not at the end of the text", () => {
    expect(findMentionQuery("hi @An there", 6)).toEqual({ start: 3, query: "An" })
  })

  it("is null without an @, inside an email, or on another line", () => {
    expect(findMentionQuery("hello", 5)).toBeNull()
    expect(findMentionQuery("me@ana", 6)).toBeNull()
    expect(findMentionQuery("@Ana\nhi", 7)).toBeNull()
  })
})

describe("encodeMentions", () => {
  it("encodes a mention, whatever the case", () => {
    expect(encodeMentions("hi @ana!", [ANA])).toBe(`hi <@${ANA.id}>!`)
  })

  it("prefers the longest name", () => {
    expect(encodeMentions("@Ana Maria", [ANA, ANA_MARIA])).toBe(`<@${ANA_MARIA.id}>`)
  })

  it("uses the people picked when two share a name", () => {
    const first = { id: "33333333-3333-3333-3333-333333333333", display_name: "Ana Pop" }
    const second = { id: "44444444-4444-4444-4444-444444444444", display_name: "Ana Pop" }
    const members = [first, second]

    expect(encodeMentions("@Ana Pop", members, [second])).toBe(`<@${second.id}>`)
    expect(encodeMentions("@Ana Pop @Ana Pop", members, [second, first])).toBe(
      `<@${second.id}> <@${first.id}>`,
    )
    expect(encodeMentions("@Ana Pop", members)).toBe(`<@${first.id}>`)
  })

  it("leaves email addresses alone", () => {
    expect(encodeMentions("contact@ana.ro", [ANA])).toBe("contact@ana.ro")
  })

  it("leaves a longer word alone, including non-ASCII letters", () => {
    expect(encodeMentions("@Anaïs", [ANA])).toBe("@Anaïs")
  })

  it("leaves code spans alone", () => {
    expect(encodeMentions("`@Ana` and @Ana", [ANA])).toBe(`\`@Ana\` and <@${ANA.id}>`)
    expect(encodeMentions("```\n@Ana\n```", [ANA])).toBe("```\n@Ana\n```")
  })
})
