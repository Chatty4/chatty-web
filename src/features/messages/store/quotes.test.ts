import { describe, expect, it } from "vitest"

import { REPLY_PREVIEW_CHARS } from "../constants"
import type { ReplyPreview } from "../types"
import { deleteQuote, editQuote } from "./quotes"
import { OTHER, localMessage } from "./test-fixtures"

const quote = (overrides: Partial<ReplyPreview> = {}): ReplyPreview => ({
  id: "msg-1",
  seq: 1,
  author_id: OTHER,
  body: "is v1.4 ready?",
  deleted: false,
  ...overrides,
})

const reply = (overrides: Partial<ReplyPreview> = {}) =>
  localMessage(2, { reply_to: quote(overrides) })

describe("editQuote", () => {
  it("shows the edited text in a reply to the edited message", () => {
    expect(editQuote(reply(), "msg-1", "is v1.5 ready?").reply_to?.body).toBe("is v1.5 ready?")
  })

  it("keeps only the start of a long text, as the server does", () => {
    const edited = editQuote(reply(), "msg-1", "x".repeat(300))
    expect(edited.reply_to?.body).toBe("x".repeat(REPLY_PREVIEW_CHARS))
  })

  it("returns the same message when it quotes another one, or none", () => {
    const other = reply({ id: "msg-9" })
    const plain = localMessage(3)
    expect(editQuote(other, "msg-1", "new")).toBe(other)
    expect(editQuote(plain, "msg-1", "new")).toBe(plain)
  })

  it("leaves a quote of a deleted message deleted", () => {
    const gone = reply({ body: "", deleted: true })
    expect(editQuote(gone, "msg-1", "late edit")).toBe(gone)
  })
})

describe("deleteQuote", () => {
  it("marks the quote deleted and clears its text, keeping who wrote it", () => {
    expect(deleteQuote(reply(), "msg-1").reply_to).toEqual(quote({ body: "", deleted: true }))
  })

  it("returns the same message when it quotes another one, or none", () => {
    const other = reply({ id: "msg-9" })
    const plain = localMessage(3)
    expect(deleteQuote(other, "msg-1")).toBe(other)
    expect(deleteQuote(plain, "msg-1")).toBe(plain)
  })
})
