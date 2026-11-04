import { describe, expect, it } from "vitest"

import { encodeMentions } from "./mentions"

const ANA = { id: "11111111-1111-1111-1111-111111111111", display_name: "Ana" }
const ANA_MARIA = { id: "22222222-2222-2222-2222-222222222222", display_name: "Ana Maria" }

describe("encodeMentions", () => {
  it("encodes a mention, whatever the case", () => {
    expect(encodeMentions("hi @ana!", [ANA])).toBe(`hi <@${ANA.id}>!`)
  })

  it("prefers the longest name", () => {
    expect(encodeMentions("@Ana Maria", [ANA, ANA_MARIA])).toBe(`<@${ANA_MARIA.id}>`)
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
