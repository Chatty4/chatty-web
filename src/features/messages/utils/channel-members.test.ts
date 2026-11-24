import { describe, expect, it } from "vitest"

import type { ChannelEventType, InboundWsMessage } from "@/lib/ws/types"

import { unknownAuthor } from "./channel-members"

function event(type: ChannelEventType, channelId: string, authorId: string): InboundWsMessage {
  return {
    type: "event",
    event: {
      type,
      channel_id: channelId,
      seq: 1,
      created_at: "2026-11-24T12:00:00Z",
      payload: { message: { author_id: authorId } },
    },
  }
}

const MEMBERS = new Set(["ana", "bob"])

describe("unknownAuthor", () => {
  it("finds the author of a new message who isn't in the list", () => {
    expect(unknownAuthor(event("message.created", "c1", "cleo"), "c1", MEMBERS)).toBe("cleo")
  })

  it("ignores authors the list already has", () => {
    expect(unknownAuthor(event("message.created", "c1", "ana"), "c1", MEMBERS)).toBeNull()
  })

  it("ignores other channels and other events", () => {
    expect(unknownAuthor(event("message.created", "c2", "cleo"), "c1", MEMBERS)).toBeNull()
    expect(unknownAuthor(event("message.edited", "c1", "cleo"), "c1", MEMBERS)).toBeNull()
    const typing: InboundWsMessage = { type: "typing", channel_id: "c1", user_id: "cleo" }
    expect(unknownAuthor(typing, "c1", MEMBERS)).toBeNull()
  })

  it("waits while the list is loading", () => {
    expect(unknownAuthor(event("message.created", "c1", "cleo"), "c1", null)).toBeNull()
  })
})
