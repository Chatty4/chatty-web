import { describe, expect, it } from "vitest"

import {
  messagesReducer,
  oldestLoadedSeq,
  type MessagesAction,
  type MessagesState,
} from "./channel-reducer"
import {
  CHANNEL,
  ME,
  OTHER,
  apiMessage,
  created,
  event,
  localMessage,
  pendingMessage,
} from "./test-fixtures"

function loaded(lastSeq: number, messages = [localMessage(lastSeq)], hasMore = false): MessagesState {
  return {
    [CHANNEL]: { messages, lastSeq, hasMore, loading: false, loadingMore: false, loadMoreFailed: false },
  }
}

const reduce = (state: MessagesState, ...actions: MessagesAction[]) =>
  actions.reduce(messagesReducer, state)
const channel = (state: MessagesState) => state[CHANNEL]!
const ids = (state: MessagesState) => channel(state).messages.map((m) => m.id)

describe("loading", () => {
  it("LOAD_START creates a loading channel once", () => {
    const state = reduce({}, { type: "LOAD_START", channelId: CHANNEL })
    expect(channel(state)).toMatchObject({ messages: [], lastSeq: 0, loading: true })
    expect(reduce(state, { type: "LOAD_START", channelId: CHANNEL })).toBe(state)
  })

  it("LOAD_DONE stores newest-first history oldest-first and sets the cursor", () => {
    const state = reduce(
      {},
      {
        type: "LOAD_DONE",
        channelId: CHANNEL,
        messages: [apiMessage(2), apiMessage(1)],
        lastSeq: 5,
        hasMore: true,
      },
    )
    expect(ids(state)).toEqual(["msg-1", "msg-2"])
    expect(channel(state)).toMatchObject({ lastSeq: 5, hasMore: true, loading: false })
  })

  it("LOAD_DONE keeps a message the user sent while the channel was loading", () => {
    const state = reduce(
      {},
      { type: "LOAD_START", channelId: CHANNEL },
      { type: "OPTIMISTIC_ADD", channelId: CHANNEL, message: pendingMessage("c1") },
      { type: "LOAD_DONE", channelId: CHANNEL, messages: [apiMessage(1)], lastSeq: 1, hasMore: false },
    )
    expect(ids(state)).toEqual(["msg-1", "c1"])
  })

  it("LOAD_FAIL keeps the channel so the list can show the error", () => {
    const state = reduce(
      {},
      { type: "LOAD_START", channelId: CHANNEL },
      { type: "LOAD_FAIL", channelId: CHANNEL },
    )
    expect(channel(state)).toMatchObject({ loading: false, loadFailed: true })
  })

  it("LOAD_START retries a failed channel and keeps what was sent meanwhile", () => {
    const state = reduce(
      {},
      { type: "LOAD_START", channelId: CHANNEL },
      { type: "LOAD_FAIL", channelId: CHANNEL },
      { type: "OPTIMISTIC_ADD", channelId: CHANNEL, message: pendingMessage("c1") },
      { type: "LOAD_START", channelId: CHANNEL },
    )
    expect(channel(state)).toMatchObject({ loading: true })
    expect(channel(state).loadFailed).toBeUndefined()
    expect(ids(state)).toEqual(["c1"])
  })
})

describe("older history", () => {
  const start: MessagesAction = { type: "LOAD_MORE_START", channelId: CHANNEL }
  const prepend = (
    messages: ReturnType<typeof apiMessage>[],
    hasMore: boolean,
    beforeSeq = 5,
  ): MessagesAction => ({
    type: "PREPEND",
    channelId: CHANNEL,
    messages,
    hasMore,
    beforeSeq,
    lastSeq: 5,
  })

  it("marks the fetch while it runs", () => {
    expect(channel(reduce(loaded(5, [localMessage(5)], true), start)).loadingMore).toBe(true)
  })

  it("puts older history first and leaves the cursor alone", () => {
    const state = reduce(
      loaded(5, [localMessage(5)], true),
      start,
      prepend([apiMessage(4), apiMessage(3)], false),
    )
    expect(ids(state)).toEqual(["msg-3", "msg-4", "msg-5"])
    expect(channel(state)).toMatchObject({ lastSeq: 5, hasMore: false, loadingMore: false })
  })

  it("keeps hasMore when the server has more", () => {
    const state = reduce(loaded(5, [localMessage(5)], true), start, prepend([apiMessage(4)], true))
    expect(channel(state).hasMore).toBe(true)
  })

  it("skips a message that is already in the list", () => {
    const state = reduce(
      loaded(5, [localMessage(5)], true),
      start,
      prepend([apiMessage(5), apiMessage(4)], false),
    )
    expect(ids(state)).toEqual(["msg-4", "msg-5"])
  })

  it("stops asking after an empty page, even if the server says there is more", () => {
    const state = reduce(loaded(5, [localMessage(5)], true), start, prepend([], true))
    expect(channel(state).hasMore).toBe(false)
  })

  it("ignores a page that arrives after a reload replaced the list", () => {
    const state = reduce(
      loaded(5, [localMessage(5)], true),
      start,
      {
        type: "RELOAD",
        channelId: CHANNEL,
        messages: [apiMessage(900)],
        lastSeq: 912,
        hasMore: true,
      },
      prepend([apiMessage(4)], true),
    )
    expect(ids(state)).toEqual(["msg-900"])
    expect(channel(state).loadingMore).toBe(false)
  })

  it("keeps live messages that arrived during the fetch", () => {
    const state = reduce(
      loaded(5, [localMessage(5)], true),
      start,
      { type: "APPLY_EVENT", channelId: CHANNEL, event: created(6), currentUserId: ME },
      prepend([apiMessage(4)], false),
    )
    expect(ids(state)).toEqual(["msg-4", "msg-5", "msg-6"])
    expect(channel(state).lastSeq).toBe(6)
  })

  it("records a failure and clears it on the next try", () => {
    const failed = reduce(loaded(5, [localMessage(5)], true), start, {
      type: "LOAD_MORE_FAIL",
      channelId: CHANNEL,
    })
    expect(channel(failed)).toMatchObject({ loadingMore: false, loadMoreFailed: true, hasMore: true })
    expect(channel(reduce(failed, start))).toMatchObject({ loadingMore: true, loadMoreFailed: false })
  })

  it("asks for the page before the smallest server seq, ignoring pending messages", () => {
    expect(oldestLoadedSeq([localMessage(7), localMessage(8), pendingMessage("c1")])).toBe(7)
    expect(oldestLoadedSeq([pendingMessage("c1")])).toBeUndefined()
  })
})

describe("RELOAD (gap too large)", () => {
  const reload = (hasMore: boolean): MessagesAction => ({
    type: "RELOAD",
    channelId: CHANNEL,
    messages: [apiMessage(900)],
    lastSeq: 912,
    hasMore,
  })

  it("throws away old messages and takes last_seq from the answer", () => {
    const state = reduce(loaded(3), reload(false))
    expect(ids(state)).toEqual(["msg-900"])
    expect(channel(state).lastSeq).toBe(912)
  })

  it("keeps older history reachable", () => {
    expect(channel(reduce(loaded(3), reload(true))).hasMore).toBe(true)
  })

  it("does not lose messages the user has not managed to send", () => {
    const failed = { ...pendingMessage("c2"), status: "failed" as const }
    const state = reduce(loaded(3, [localMessage(3), pendingMessage("c1"), failed]), reload(false))
    expect(ids(state)).toEqual(["msg-900", "c1", "c2"])
  })
})

describe("events", () => {
  const apply = (seq: number): MessagesAction => ({
    type: "APPLY_EVENT",
    channelId: CHANNEL,
    event: created(seq),
    currentUserId: ME,
  })

  it("APPLY_EVENT applies the next event and moves the cursor", () => {
    const state = reduce(loaded(3), apply(4))
    expect(ids(state)).toEqual(["msg-3", "msg-4"])
    expect(channel(state).lastSeq).toBe(4)
  })

  it("APPLY_EVENT ignores a duplicate", () => {
    const state = loaded(3)
    expect(reduce(state, apply(3))).toBe(state)
  })

  it("an event about a message that isn't loaded still moves the cursor", () => {
    const state = reduce(loaded(3), {
      type: "APPLY_EVENT",
      channelId: CHANNEL,
      event: {
        type: "pin.added",
        channel_id: CHANNEL,
        seq: 4,
        created_at: "2026-10-05T14:00:00Z",
        payload: { message_id: "far-up-in-history" },
      },
      currentUserId: ME,
    })
    expect(channel(state).lastSeq).toBe(4)
    expect(ids(state)).toEqual(["msg-3"])
  })

  it("APPLY_EVENTS skips what was already applied and takes the server's last_seq", () => {
    const state = reduce(loaded(3), {
      type: "APPLY_EVENTS",
      channelId: CHANNEL,
      events: [created(3), created(4), created(5)],
      lastSeq: 7,
      currentUserId: ME,
    })
    expect(ids(state)).toEqual(["msg-3", "msg-4", "msg-5"])
    expect(channel(state).lastSeq).toBe(7)
  })

  it("ignores events for a channel that isn't loaded", () => {
    expect(reduce({}, apply(1))).toEqual({})
  })
})

describe("optimistic send", () => {
  const add: MessagesAction = {
    type: "OPTIMISTIC_ADD",
    channelId: CHANNEL,
    message: pendingMessage("c1"),
  }
  const confirm = (seq: number): MessagesAction => ({
    type: "OPTIMISTIC_CONFIRM",
    channelId: CHANNEL,
    clientMsgId: "c1",
    confirmed: apiMessage(seq, { author_id: ME }),
  })

  it("replaces the pending copy with the confirmed message", () => {
    const state = reduce(loaded(3), add, confirm(4))
    expect(ids(state)).toEqual(["msg-3", "msg-4"])
    expect(channel(state).messages[1]!.status).toBe("sent")
  })

  it("does not move the cursor past events that were not applied", () => {
    const state = reduce(loaded(3), add, confirm(9))
    expect(channel(state).lastSeq).toBe(3)
  })

  it("drops the pending copy when the event already added the message", () => {
    const state = reduce(
      loaded(3),
      add,
      { type: "APPLY_EVENT", channelId: CHANNEL, event: created(4), currentUserId: ME },
      confirm(4),
    )
    expect(ids(state)).toEqual(["msg-3", "msg-4"])
  })

  // The event carries client_msg_id (api-chat.md, message object), so it replaces the
  // pending copy in place: no second copy shows while the POST answer is on its way.
  const createdForMe = (seq: number, extra: Record<string, unknown> = {}): MessagesAction => ({
    type: "APPLY_EVENT",
    channelId: CHANNEL,
    event: created(seq, { author_id: ME, client_msg_id: "c1", ...extra }),
    currentUserId: ME,
  })

  it("shows the message once when the event with client_msg_id comes before the answer", () => {
    const afterEvent = reduce(loaded(3), add, createdForMe(4))
    expect(ids(afterEvent)).toEqual(["msg-3", "msg-4"])

    const state = reduce(afterEvent, confirm(4))
    expect(ids(state)).toEqual(["msg-3", "msg-4"])
    expect(channel(state).messages[1]!.status).toBe("sent")
  })

  it("keeps a reaction that came between the event and the answer", () => {
    const reacted: MessagesAction = {
      type: "APPLY_EVENT",
      channelId: CHANNEL,
      event: event("reaction.added", 5, { message_id: "msg-4", user_id: OTHER, emoji: "👍" }),
      currentUserId: ME,
    }

    const state = reduce(loaded(3), add, createdForMe(4), reacted, confirm(4))

    expect(channel(state).messages[1]!.reactions).toEqual([{ emoji: "👍", count: 1, me: false }])
  })

  it("keeps the message sent when the answer is lost after the event arrived", () => {
    const state = reduce(loaded(3), add, createdForMe(4), {
      type: "OPTIMISTIC_FAIL",
      failure: { message: "Not sent", retryable: true },
      channelId: CHANNEL,
      clientMsgId: "c1",
    })

    expect(ids(state)).toEqual(["msg-3", "msg-4"])
    expect(channel(state).messages[1]!.status).toBe("sent")
    expect(channel(state).messages[1]!.failure).toBeUndefined()
  })

  it("doesn't turn a sent message back into pending on retry", () => {
    const state = reduce(loaded(3), add, createdForMe(4), {
      type: "OPTIMISTIC_RETRY",
      channelId: CHANNEL,
      clientMsgId: "c1",
    })

    expect(channel(state).messages[1]!.status).toBe("sent")
  })

  it("marks a failed send and lets it retry", () => {
    const failed = reduce(loaded(3), add, {
      type: "OPTIMISTIC_FAIL",
      failure: { message: "Not sent", retryable: true },
      channelId: CHANNEL,
      clientMsgId: "c1",
    })
    expect(channel(failed).messages[1]!.status).toBe("failed")

    const retrying = reduce(failed, {
      type: "OPTIMISTIC_RETRY",
      channelId: CHANNEL,
      clientMsgId: "c1",
    })
    expect(channel(retrying).messages[1]!.status).toBe("pending")
    expect(channel(retrying).messages[1]!.failure).toBeUndefined()
  })

  it("removes a failed message when it is dismissed", () => {
    const failed = reduce(loaded(3), add, {
      type: "OPTIMISTIC_FAIL",
      failure: { message: "Not sent", retryable: false },
      channelId: CHANNEL,
      clientMsgId: "c1",
    })
    expect(channel(failed).messages[1]!.failure?.retryable).toBe(false)

    const dismissed = reduce(failed, {
      type: "OPTIMISTIC_DISCARD",
      channelId: CHANNEL,
      clientMsgId: "c1",
    })
    expect(ids(dismissed)).toEqual(["msg-3"])
  })
})

describe("my own edit and delete", () => {
  it("MESSAGE_EDITED and MESSAGE_DELETED leave the cursor alone", () => {
    const state = reduce(
      loaded(3),
      {
        type: "MESSAGE_EDITED",
        channelId: CHANNEL,
        edit: {
          message_id: "msg-3",
          body: "fixed",
          mentions: [],
          edited_at: "2026-10-05T14:05:00Z",
        },
      },
      {
        type: "MESSAGE_DELETED",
        channelId: CHANNEL,
        messageId: "msg-3",
        deletedAt: "2026-10-05T14:06:00Z",
      },
    )
    expect(channel(state).lastSeq).toBe(3)
    expect(channel(state).messages[0]!.deleted_at).toBe("2026-10-05T14:06:00Z")
  })
})

it("DROP_CHANNEL removes the channel", () => {
  expect(reduce(loaded(3), { type: "DROP_CHANNEL", channelId: CHANNEL })).toEqual({})
})
