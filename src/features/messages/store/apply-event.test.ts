import { describe, expect, it } from "vitest"

import { applyDelete, applyEdit, applyEvent } from "./apply-event"
import {
  ME,
  OTHER,
  created,
  deleted,
  edited,
  event,
  localMessage,
  pendingMessage,
} from "./test-fixtures"

const ids = (messages: { id: string }[]) => messages.map((m) => m.id)

describe("message.created", () => {
  it("appends a new message", () => {
    const result = applyEvent([localMessage(1)], created(2), ME)
    expect(ids(result)).toEqual(["msg-1", "msg-2"])
    expect(result[1]!.status).toBe("sent")
  })

  it("keeps seq order when an older event arrives after a newer message", () => {
    const result = applyEvent([localMessage(1), localMessage(3)], created(2), ME)
    expect(ids(result)).toEqual(["msg-1", "msg-2", "msg-3"])
  })

  it("keeps pending messages at the end", () => {
    const result = applyEvent([localMessage(1), pendingMessage("c1")], created(2), ME)
    expect(ids(result)).toEqual(["msg-1", "msg-2", "c1"])
  })

  it("replaces the optimistic copy when the event has the same client_msg_id", () => {
    const result = applyEvent([pendingMessage("c1")], created(2, { client_msg_id: "c1" }), ME)
    expect(ids(result)).toEqual(["msg-2"])
    expect(result[0]!.status).toBe("sent")
  })

  it("does not add a second copy of a message already in the list", () => {
    const result = applyEvent([localMessage(2)], created(2), ME)
    expect(ids(result)).toEqual(["msg-2"])
  })

  it("does not undo a later edit or delete when a created event is replayed", () => {
    const editedMessage = localMessage(2, { body: "fixed", edited_at: "2026-10-05T14:01:00Z" })
    const deletedMessage = localMessage(3, { body: "", deleted_at: "2026-10-05T14:02:00Z" })

    const result = [created(2), created(3)].reduce(
      (messages, e) => applyEvent(messages, e, ME),
      [editedMessage, deletedMessage],
    )

    expect(result).toEqual([editedMessage, deletedMessage])
  })
})

describe("message.edited", () => {
  it("replaces body and mentions and sets edited_at", () => {
    const [message] = applyEvent(
      [localMessage(1)],
      event("message.edited", 2, {
        message_id: "msg-1",
        body: "new body",
        mentions: ["u3"],
        edited_at: "2026-10-05T14:05:00Z",
      }),
      ME,
    )
    expect(message).toMatchObject({
      body: "new body",
      mentions: ["u3"],
      edited_at: "2026-10-05T14:05:00Z",
    })
  })

  it("ignores a message that is not loaded", () => {
    const messages = [localMessage(5)]
    const result = applyEvent(messages, edited(6, "msg-1", "x", "2026-10-05T14:05:00Z"), ME)
    expect(result).toEqual(messages)
  })

  it("is safe to apply twice (REST answer and WS event)", () => {
    const edit = {
      message_id: "msg-1",
      body: "same",
      mentions: [],
      edited_at: "2026-10-05T14:05:00Z",
    }
    const once = applyEdit([localMessage(1)], edit)
    expect(applyEdit(once, edit)).toEqual(once)
  })

  it("never lets an older edit overwrite a newer one", () => {
    const messages = [localMessage(1, { body: "newer", edited_at: "2026-10-05T14:10:00Z" })]
    const result = applyEvent(messages, edited(2, "msg-1", "older", "2026-10-05T14:05:00Z"), ME)
    expect(result[0]!.body).toBe("newer")
  })

  it("cannot bring back a deleted message", () => {
    const messages = [localMessage(1, { body: "", deleted_at: "2026-10-05T14:10:00Z" })]
    const result = applyEvent(messages, edited(2, "msg-1", "back", "2026-10-05T14:20:00Z"), ME)
    expect(result[0]!.body).toBe("")
  })
})

describe("message.deleted", () => {
  it("clears the content but keeps the message in its place", () => {
    const messages = [
      localMessage(1),
      localMessage(2, {
        file_ids: ["f1"],
        mentions: ["u3"],
        reactions: [{ emoji: "👍", count: 1, me: false }],
        pinned: true,
      }),
      localMessage(3),
    ]

    const result = applyEvent(messages, deleted(4, "msg-2"), ME)

    expect(ids(result)).toEqual(["msg-1", "msg-2", "msg-3"])
    expect(result[1]).toMatchObject({
      body: "",
      deleted_at: "2026-10-05T15:00:00Z",
      file_ids: [],
      mentions: [],
      reactions: [],
      pinned: false,
    })
  })

  it("keeps the first deleted_at when applied twice", () => {
    const once = applyDelete([localMessage(1)], "msg-1", "2026-10-05T15:00:00Z")
    const twice = applyDelete(once, "msg-1", "2026-10-05T16:00:00Z")
    expect(twice[0]!.deleted_at).toBe("2026-10-05T15:00:00Z")
  })
})

describe("reactions", () => {
  const added = (userId: string) =>
    event("reaction.added", 2, { message_id: "msg-1", user_id: userId, emoji: "👍" })
  const removed = (userId: string) =>
    event("reaction.removed", 3, { message_id: "msg-1", user_id: userId, emoji: "👍" })

  it("adds a new reaction", () => {
    const [message] = applyEvent([localMessage(1)], added(OTHER), ME)
    expect(message!.reactions).toEqual([{ emoji: "👍", count: 1, me: false }])
  })

  it("moves count, and me only for the current user", () => {
    const messages = [localMessage(1, { reactions: [{ emoji: "👍", count: 1, me: false }] })]
    expect(applyEvent(messages, added(OTHER), ME)[0]!.reactions[0]).toEqual({
      emoji: "👍",
      count: 2,
      me: false,
    })
    expect(applyEvent(messages, added(ME), ME)[0]!.reactions[0]).toEqual({
      emoji: "👍",
      count: 2,
      me: true,
    })
  })

  it("removes the reaction when the count reaches zero", () => {
    const messages = [localMessage(1, { reactions: [{ emoji: "👍", count: 1, me: true }] })]
    expect(applyEvent(messages, removed(ME), ME)[0]!.reactions).toEqual([])
  })

  it("keeps me when someone else removes theirs", () => {
    const messages = [localMessage(1, { reactions: [{ emoji: "👍", count: 2, me: true }] })]
    expect(applyEvent(messages, removed(OTHER), ME)[0]!.reactions).toEqual([
      { emoji: "👍", count: 1, me: true },
    ])
  })
})

describe("pins", () => {
  it("sets and clears pinned", () => {
    const pinned = applyEvent([localMessage(1)], event("pin.added", 2, { message_id: "msg-1" }), ME)
    expect(pinned[0]!.pinned).toBe(true)
    const unpinned = applyEvent(pinned, event("pin.removed", 3, { message_id: "msg-1" }), ME)
    expect(unpinned[0]!.pinned).toBe(false)
  })
})
