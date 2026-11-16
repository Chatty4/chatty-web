// Jumping to a message (around_seq) and scrolling down from it (after_seq).
import { describe, expect, it } from "vitest"

import { messagesReducer, newestLoadedSeq, type MessagesAction, type MessagesState } from "./channel-reducer"
import { CHANNEL, ME, OTHER, apiMessage, created, event, localMessage, pendingMessage } from "./test-fixtures"

const reduce = (state: MessagesState, ...actions: MessagesAction[]) =>
  actions.reduce(messagesReducer, state)
const channel = (state: MessagesState) => state[CHANNEL]!
const ids = (state: MessagesState) => channel(state).messages.map((m) => m.id)

/** The window around seq 5 of a channel whose newest event is 20. */
function jumped(lastSeq = 20, hasMoreAfter = true): MessagesState {
  return reduce({}, {
    type: "JUMP_LOADED",
    channelId: CHANNEL,
    messages: [apiMessage(6), apiMessage(5), apiMessage(4)],
    lastSeq,
    hasMore: true,
    hasMoreAfter,
    messageId: "msg-5",
    key: 1,
  })
}

const append = (
  messages: ReturnType<typeof apiMessage>[],
  hasMoreAfter: boolean,
  lastSeq = 20,
  afterSeq = 6,
): MessagesAction => ({ type: "APPEND", channelId: CHANNEL, messages, hasMoreAfter, afterSeq, lastSeq })

const apply = (e: ReturnType<typeof created>): MessagesAction => ({
  type: "APPLY_EVENT",
  channelId: CHANNEL,
  event: e,
  currentUserId: ME,
})

describe("jump to a message", () => {
  it("shows the window oldest first, detached from the newest, and asks to scroll to it", () => {
    const state = jumped()
    expect(ids(state)).toEqual(["msg-4", "msg-5", "msg-6"])
    expect(channel(state)).toMatchObject({
      lastSeq: 20,
      hasMore: true,
      hasMoreAfter: true,
      loading: false,
      focus: { messageId: "msg-5", key: 1 },
    })
  })

  it("keeps what the user hadn't managed to send", () => {
    const before: MessagesState = {
      [CHANNEL]: { ...channel(jumped()), messages: [pendingMessage("c1")] },
    }
    const state = reduce(before, {
      type: "JUMP_LOADED",
      channelId: CHANNEL,
      messages: [apiMessage(5)],
      lastSeq: 20,
      hasMore: false,
      hasMoreAfter: true,
      messageId: "msg-5",
      key: 2,
    })
    expect(ids(state)).toEqual(["msg-5", "c1"])
  })

  it("a reload goes back to the newest messages", () => {
    const state = reduce(jumped(), {
      type: "RELOAD",
      channelId: CHANNEL,
      messages: [apiMessage(20)],
      lastSeq: 20,
      hasMore: true,
    })
    expect(channel(state).hasMoreAfter).toBeFalsy()
    expect(channel(state).focus).toBeUndefined()
  })

  it("FOCUS only asks to scroll to a loaded message", () => {
    const state = reduce(jumped(), { type: "FOCUS", channelId: CHANNEL, messageId: "msg-4", key: 7 })
    expect(ids(state)).toEqual(["msg-4", "msg-5", "msg-6"])
    expect(channel(state).focus).toEqual({ messageId: "msg-4", key: 7 })
  })
})

describe("live events while the window is detached", () => {
  it("doesn't add a new message below the window: it comes with the newer pages", () => {
    const state = reduce(jumped(), apply(created(21)))
    expect(ids(state)).toEqual(["msg-4", "msg-5", "msg-6"])
    expect(channel(state).lastSeq).toBe(21)
  })

  it("still applies changes to messages in the window", () => {
    const state = reduce(
      jumped(),
      apply(event("reaction.added", 21, { message_id: "msg-5", user_id: OTHER, emoji: "👍" })),
    )
    expect(channel(state).messages[1]!.reactions).toEqual([{ emoji: "👍", count: 1, me: false }])
  })

  it("still turns my pending copy into the sent message", () => {
    const before: MessagesState = {
      [CHANNEL]: { ...channel(jumped()), messages: [localMessage(5), pendingMessage("c1")] },
    }
    const state = reduce(before, apply(created(21, { id: "msg-21", client_msg_id: "c1", author_id: ME })))
    expect(ids(state)).toEqual(["msg-5", "msg-21"])
  })

  it("adds new messages again once attached to the newest", () => {
    const state = reduce(jumped(20, false), apply(created(21)))
    expect(ids(state)).toEqual(["msg-4", "msg-5", "msg-6", "msg-21"])
  })
})

describe("newer pages", () => {
  const start: MessagesAction = { type: "LOAD_NEWER_START", channelId: CHANNEL }

  it("marks the fetch while it runs, and a failure until the user retries", () => {
    expect(channel(reduce(jumped(), start)).loadingNewer).toBe(true)
    const failed = reduce(jumped(), start, { type: "LOAD_NEWER_FAIL", channelId: CHANNEL })
    expect(channel(failed)).toMatchObject({ loadingNewer: false, loadNewerFailed: true })
  })

  it("adds the page below, oldest first, and stays detached while there is more", () => {
    const state = reduce(jumped(), start, append([apiMessage(8), apiMessage(7)], true))
    expect(ids(state)).toEqual(["msg-4", "msg-5", "msg-6", "msg-7", "msg-8"])
    expect(channel(state)).toMatchObject({ hasMoreAfter: true, loadingNewer: false, lastSeq: 20 })
    expect(newestLoadedSeq(channel(state).messages)).toBe(8)
  })

  it("attaches to the newest on the last page", () => {
    const state = reduce(jumped(), start, append([apiMessage(9)], false))
    expect(channel(state).hasMoreAfter).toBe(false)
  })

  it("marks the page with its snapshot, so reactions it already counts aren't added again", () => {
    const state = reduce(jumped(), start, append([apiMessage(7)], false, 22))
    expect(channel(state).messages.at(-1)!.asOfSeq).toBe(22)
  })

  it("keeps unsent messages at the end", () => {
    const before: MessagesState = {
      [CHANNEL]: { ...channel(jumped()), messages: [localMessage(6), pendingMessage("c1")] },
    }
    const state = reduce(before, start, append([apiMessage(7)], false))
    expect(ids(state)).toEqual(["msg-6", "msg-7", "c1"])
  })

  it("drops a page older than events already applied, and asks again", () => {
    // msg-21 arrived (and was skipped) while a page with snapshot 20 was in flight.
    const state = reduce(jumped(), start, apply(created(21)), append([apiMessage(7)], false, 20))
    expect(ids(state)).toEqual(["msg-4", "msg-5", "msg-6"])
    expect(channel(state)).toMatchObject({ hasMoreAfter: true, loadingNewer: false })
  })

  it("ignores a page that arrives after a reload replaced the list", () => {
    const state = reduce(
      jumped(),
      start,
      { type: "RELOAD", channelId: CHANNEL, messages: [apiMessage(20)], lastSeq: 20, hasMore: true },
      append([apiMessage(7)], false),
    )
    expect(ids(state)).toEqual(["msg-20"])
  })

  it("stops asking after an empty page, even if the server says there is more", () => {
    const state = reduce(jumped(), start, append([], true))
    expect(channel(state).hasMoreAfter).toBe(false)
  })
})
