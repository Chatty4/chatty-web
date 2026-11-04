import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api"

import type { GetEventsResponse } from "../types"
import { messagesReducer, type MessagesAction, type MessagesState } from "./channel-reducer"
import { createEventSequencer } from "./event-sequencer"
import { CHANNEL, ME, apiMessage, created, localMessage } from "./test-fixtures"

/** Lets pending promise callbacks run. */
const settle = () => new Promise((resolve) => setTimeout(resolve))

function setup({
  lastSeq = 3,
  loading = false,
  getEvents = vi.fn<(channelId: string, afterSeq: number) => Promise<GetEventsResponse>>(),
}: {
  lastSeq?: number
  loading?: boolean
  getEvents?: ReturnType<
    typeof vi.fn<(channelId: string, afterSeq: number) => Promise<GetEventsResponse>>
  >
} = {}) {
  let state: MessagesState = {
    [CHANNEL]: { messages: [localMessage(lastSeq)], lastSeq, hasMore: false, loading },
  }
  const dispatch = (action: MessagesAction) => {
    state = messagesReducer(state, action)
  }
  const reload = vi.fn(async (channelId: string) => {
    dispatch({
      type: "RELOAD",
      channelId,
      messages: [apiMessage(900)],
      lastSeq: 900,
      hasMore: true,
    })
  })
  const sequencer = createEventSequencer({
    getChannel: (id) => state[id],
    getUserId: () => ME,
    dispatch,
    getEvents,
    reload,
  })
  return {
    sequencer,
    getEvents,
    reload,
    dispatch,
    seqs: () => state[CHANNEL]?.messages.map((m) => m.seq),
    lastSeq: () => state[CHANNEL]?.lastSeq,
  }
}

describe("live events", () => {
  it("applies the next event", () => {
    const { sequencer, seqs, lastSeq } = setup()
    sequencer.receive(created(4))
    expect(seqs()).toEqual([3, 4])
    expect(lastSeq()).toBe(4)
  })

  it("ignores a duplicate without fetching", () => {
    const { sequencer, seqs, getEvents } = setup()
    sequencer.receive(created(3))
    expect(seqs()).toEqual([3])
    expect(getEvents).not.toHaveBeenCalled()
  })

  it("ignores events for a channel that was never opened", () => {
    const { sequencer, getEvents } = setup()
    sequencer.receive({ ...created(50), channel_id: "never-opened" })
    expect(getEvents).not.toHaveBeenCalled()
  })
})

describe("gaps", () => {
  it("fetches what's missing, then applies the event that showed the gap", async () => {
    const getEvents = vi.fn(async () => ({
      events: [created(4), created(5)],
      last_seq: 5,
      has_more: false,
    }))
    const { sequencer, seqs, lastSeq } = setup({ getEvents })

    sequencer.receive(created(6))
    expect(seqs()).toEqual([3])
    await settle()

    expect(getEvents).toHaveBeenCalledWith(CHANNEL, 3)
    expect(seqs()).toEqual([3, 4, 5, 6])
    expect(lastSeq()).toBe(6)
  })

  it("follows has_more through every page", async () => {
    const getEvents = vi
      .fn<(channelId: string, afterSeq: number) => Promise<GetEventsResponse>>()
      .mockResolvedValueOnce({ events: [created(4)], last_seq: 4, has_more: true })
      .mockResolvedValueOnce({ events: [created(5)], last_seq: 5, has_more: false })
    const { sequencer, seqs } = setup({ getEvents })

    sequencer.receive(created(6))
    await settle()

    expect(getEvents).toHaveBeenNthCalledWith(2, CHANNEL, 4)
    expect(seqs()).toEqual([3, 4, 5, 6])
  })

  it("does not lose events that arrive during the fetch, and fetches only once", async () => {
    const getEvents = vi.fn(async () => ({
      events: [created(4), created(5)],
      last_seq: 5,
      has_more: false,
    }))
    const { sequencer, seqs } = setup({ getEvents })

    sequencer.receive(created(6))
    sequencer.receive(created(7))
    sequencer.receive(created(8))
    await settle()

    expect(getEvents).toHaveBeenCalledTimes(1)
    expect(seqs()).toEqual([3, 4, 5, 6, 7, 8])
  })

  it("reloads from history on 409 gap_too_large", async () => {
    const getEvents = vi.fn(async () => {
      throw new ApiError(409, "gap_too_large", "too old")
    })
    const { sequencer, seqs, reload } = setup({ getEvents })

    sequencer.receive(created(6))
    await settle()

    expect(reload).toHaveBeenCalledWith(CHANNEL)
    expect(seqs()).toEqual([900])
  })

  it("gives up on a failed fetch, and the next event tries again", async () => {
    const getEvents = vi
      .fn<(channelId: string, afterSeq: number) => Promise<GetEventsResponse>>()
      .mockRejectedValueOnce(new ApiError(0, "network_error", "offline"))
      .mockResolvedValueOnce({
        events: [created(4), created(5), created(6)],
        last_seq: 6,
        has_more: false,
      })
    const { sequencer, seqs } = setup({ getEvents })

    sequencer.receive(created(6))
    await settle()
    expect(getEvents).toHaveBeenCalledTimes(1)
    expect(seqs()).toEqual([3])

    sequencer.receive(created(7))
    await settle()
    expect(seqs()).toEqual([3, 4, 5, 6, 7])
  })

  it("does not spin when the server has nothing new to give", async () => {
    const getEvents = vi.fn(async () => ({ events: [], last_seq: 3, has_more: false }))
    const { sequencer } = setup({ getEvents })

    sequencer.receive(created(6))
    await settle()

    expect(getEvents).toHaveBeenCalledTimes(1)
  })
})

describe("while the channel loads", () => {
  it("holds events instead of treating them as a gap, then replays them", () => {
    const { sequencer, getEvents, dispatch, seqs } = setup({ lastSeq: 0, loading: true })

    sequencer.receive(created(4))
    sequencer.receive(created(5))
    expect(getEvents).not.toHaveBeenCalled()

    dispatch({
      type: "LOAD_DONE",
      channelId: CHANNEL,
      messages: [apiMessage(4), apiMessage(3)],
      lastSeq: 4,
      hasMore: false,
    })
    sequencer.release(CHANNEL)

    expect(seqs()).toEqual([3, 4, 5])
  })
})
