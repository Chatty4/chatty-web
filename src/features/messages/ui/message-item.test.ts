import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ME, OTHER, localMessage } from "../store/test-fixtures"
import type { LocalMessage } from "../types"
import { MessageItem, type MessageItemProps } from "./message-item"

const noop = () => {}
const resolved = () => Promise.resolve(undefined)

function render(
  message: LocalMessage,
  own = false,
  overrides: Partial<MessageItemProps> = {},
): string {
  const props: MessageItemProps = {
    message,
    authorName: "Ana Pop",
    authorAvatarFileId: null,
    authorOnline: false,
    mentionsMe: false,
    repliesToMe: false,
    names: {},
    mentionable: [],
    grouped: false,
    own,
    canEdit: false,
    canDelete: false,
    canReact: false,
    onSetReaction: resolved,
    canReply: false,
    onReply: noop,
    onOpenQuote: noop,
    canForward: true,
    onForward: noop,
    canPin: false,
    onSetPinned: resolved,
    onEdit: resolved,
    onDelete: resolved,
    onRetry: resolved,
    onDiscard: noop,
    onChannelArchived: noop,
    receipt: null,
    onShowInfo: noop,
    ...overrides,
  }
  return renderToStaticMarkup(createElement(MessageItem, props))
}

describe("the Forward action", () => {
  it("is in the toolbar when the message can be forwarded", () => {
    expect(render(localMessage(1))).toContain('aria-label="Forward message"')
  })

  it("isn't there otherwise, nor on a deleted message", () => {
    expect(render(localMessage(1), false, { canForward: false })).not.toContain("Forward message")
    const deleted = localMessage(1, { deleted_at: "2026-10-05T14:10:00Z" })
    expect(render(deleted)).not.toContain("Forward message")
  })
})

describe("the Forwarded label", () => {
  it("shows on a forwarded message, mine or someone else's", () => {
    expect(render(localMessage(1, { author_id: OTHER, forwarded: true }))).toContain("Forwarded")
    expect(render(localMessage(1, { author_id: ME, forwarded: true }), true)).toContain("Forwarded")
  })

  it("doesn't show on other messages", () => {
    expect(render(localMessage(1, { author_id: OTHER }))).not.toContain("Forwarded")
    expect(render(localMessage(1, { author_id: ME }), true)).not.toContain("Forwarded")
  })

  it("never names where the message came from", () => {
    const html = render(localMessage(1, { author_id: OTHER, forwarded: true, body: "q3 numbers" }))
    expect(html).toContain("q3 numbers")
    expect(html).not.toMatch(/Forwarded from/)
  })
})
