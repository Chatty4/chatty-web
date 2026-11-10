import { describe, expect, it } from "vitest"

import { countNewMessages, messageKey } from "./new-messages"

const ME = "me"

function msg(id: string, author_id = "bob", client_msg_id?: string) {
  return { id, author_id, client_msg_id }
}

/** `count` older messages, as one history page loaded at the top. */
function olderPage(count: number) {
  return Array.from({ length: count }, (_, i) => msg(`old-${i}`))
}

describe("messageKey", () => {
  it("prefers client_msg_id, so the pending and the saved copy match", () => {
    expect(messageKey(msg("m1", ME, "c1"))).toBe("c1")
    expect(messageKey(msg("m1"))).toBe("m1")
  })
})

describe("countNewMessages", () => {
  it("counts the messages after the previous newest one", () => {
    const messages = [msg("a"), msg("b"), msg("c"), msg("d")]
    expect(countNewMessages(messages, "b", ME)).toBe(2)
  })

  it("ignores an older page loaded at the top meanwhile", () => {
    // Before: [a, b]. Then 50 older messages at the top and one new at the bottom.
    const messages = [...olderPage(50), msg("a"), msg("b"), msg("c")]
    expect(countNewMessages(messages, "b", ME)).toBe(1)
  })

  it("leaves my own messages out", () => {
    const messages = [msg("a"), msg("b", ME, "c1"), msg("c")]
    expect(countNewMessages(messages, "a", ME)).toBe(1)
  })

  it("finds the previous newest message by its client_msg_id", () => {
    const messages = [msg("a"), msg("saved", "bob", "c1"), msg("c")]
    expect(countNewMessages(messages, "c1", ME)).toBe(1)
  })

  it("counts one when the previous newest message is gone", () => {
    const messages = [msg("x"), msg("y")]
    expect(countNewMessages(messages, "missing", ME)).toBe(1)
  })
})
