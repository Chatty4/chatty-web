import { describe, expect, it } from "vitest"

import { REPLY_PREVIEW_CHARS } from "../constants"
import { OTHER, apiMessage } from "../store/test-fixtures"
import type { ReplyPreview } from "../types"
import { quoteText, quotedUserIds, toReplyPreview } from "./reply"

const ANA = "3f2b6c1e-8d4a-4b7e-9c1d-2a5f6e7b8c9d"

const quote = (overrides: Partial<ReplyPreview> = {}): ReplyPreview => ({
  id: "msg-1",
  seq: 1,
  author_id: OTHER,
  body: "is v1.4 ready?",
  deleted: false,
  ...overrides,
})

describe("toReplyPreview", () => {
  it("quotes the message like the server: id, seq, author and the start of the text", () => {
    const message = apiMessage(4, { body: "x".repeat(300) })
    expect(toReplyPreview(message)).toEqual({
      id: "msg-4",
      seq: 4,
      author_id: OTHER,
      body: "x".repeat(REPLY_PREVIEW_CHARS),
      deleted: false,
    })
  })
})

describe("quotedUserIds", () => {
  it("lists the quoted author and who the quoted text mentions", () => {
    const reply = apiMessage(2, { reply_to: quote({ body: `ask <@${ANA}>` }) })
    expect(quotedUserIds(reply)).toEqual([OTHER, ANA])
  })

  it("is empty for a message that isn't a reply", () => {
    expect(quotedUserIds(apiMessage(2))).toEqual([])
  })
})

describe("quoteText", () => {
  it("shows the text, with mentions as names", () => {
    expect(quoteText(quote({ body: `ask <@${ANA}>` }), { [ANA]: "Ana" })).toBe("ask @Ana")
  })

  it("says the original was deleted", () => {
    expect(quoteText(quote({ body: "", deleted: true }), {})).toBe("Original message was deleted")
  })

  it("stands for a message with only files", () => {
    expect(quoteText(quote({ body: "" }), {})).toBe("📎 File")
    expect(quoteText(quote({ body: "  " }), {})).toBe("📎 File")
  })

  it("stands for a GIF", () => {
    expect(quoteText(quote({ body: "https://media.giphy.com/media/abc/giphy.gif" }), {})).toBe("GIF")
  })
})
