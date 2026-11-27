import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api"

import type { ForwardApi } from "../types"
import { allSent, planSends, runSend } from "./forward-sends"

const MESSAGE = "msg-1"

function ids() {
  let next = 0
  return () => `id-${++next}`
}

/** Records every call in order; `fail` makes the matching call reject once. */
function fakeApi(fail?: { step: "comment" | "forward"; error: unknown }) {
  const calls: string[] = []
  let failed = false
  const maybeFail = (step: "comment" | "forward") => {
    if (fail?.step === step && !failed) {
      failed = true
      return Promise.reject(fail.error)
    }
    return Promise.resolve()
  }
  const api: ForwardApi = {
    sendComment: vi.fn((channelId: string, body: string, clientMsgId: string) => {
      calls.push(`comment ${channelId} ${body} ${clientMsgId}`)
      return maybeFail("comment")
    }),
    forward: vi.fn((channelId: string, messageId: string, clientMsgId: string) => {
      calls.push(`forward ${channelId} ${messageId} ${clientMsgId}`)
      return maybeFail("forward")
    }),
  }
  return { api, calls }
}

describe("planSends", () => {
  it("makes one id per message, the comment's only when there is one", () => {
    expect(planSends(["a", "b"], "look", ids())).toEqual({
      a: { channelId: "a", status: "sending", commentId: "id-1", forwardId: "id-2", commentSent: false },
      b: { channelId: "b", status: "sending", commentId: "id-3", forwardId: "id-4", commentSent: false },
    })
    expect(planSends(["a"], "   ", ids()).a!.commentId).toBeNull()
  })
})

describe("runSend", () => {
  it("sends the comment before the forward", async () => {
    const { api, calls } = fakeApi()
    const send = planSends(["a"], "look", ids()).a!

    const done = await runSend(send, { messageId: MESSAGE, comment: "look" }, api)

    expect(calls).toEqual(["comment a look id-1", "forward a msg-1 id-2"])
    expect(done).toMatchObject({ status: "sent", commentSent: true })
  })

  it("sends only the forward without a comment", async () => {
    const { api, calls } = fakeApi()
    const send = planSends(["a"], "", ids()).a!

    await runSend(send, { messageId: MESSAGE, comment: "" }, api)

    expect(calls).toEqual(["forward a msg-1 id-1"])
  })

  it("keeps a failure, and a retry sends only what is missing with the same ids", async () => {
    const error = new ApiError(503, "core_unavailable", "down")
    const { api, calls } = fakeApi({ step: "forward", error })
    const send = planSends(["a"], "look", ids()).a!
    const job = { messageId: MESSAGE, comment: "look" }

    const failed = await runSend(send, job, api)
    expect(failed).toMatchObject({ status: "failed", commentSent: true })
    expect(failed.failure).toEqual({ message: "Not sent", retryable: true })

    const retried = await runSend(failed, job, api)
    expect(retried).toMatchObject({ status: "sent", failure: undefined })
    // the comment went once; the forward was tried twice with the same client_msg_id
    expect(calls).toEqual(["comment a look id-1", "forward a msg-1 id-2", "forward a msg-1 id-2"])
  })

  it("doesn't forward when the comment failed", async () => {
    const { api, calls } = fakeApi({ step: "comment", error: new TypeError("offline") })
    const send = planSends(["a"], "look", ids()).a!

    const failed = await runSend(send, { messageId: MESSAGE, comment: "look" }, api)

    expect(failed).toMatchObject({ status: "failed", commentSent: false })
    expect(calls).toEqual(["comment a look id-1"])
  })

  it("says when the message was deleted meanwhile, without a retry", async () => {
    const error = new ApiError(404, "message_not_found", "gone")
    const { api } = fakeApi({ step: "forward", error })
    const send = planSends(["a"], "", ids()).a!

    const failed = await runSend(send, { messageId: MESSAGE, comment: "" }, api)

    expect(failed.failure).toEqual({
      message: "This message can't be forwarded anymore.",
      retryable: false,
    })
  })
})

describe("allSent", () => {
  it("is true only when every destination is sent", () => {
    const sends = planSends(["a", "b"], "", ids())
    expect(allSent(sends)).toBe(false)
    expect(allSent({ ...sends, a: { ...sends.a!, status: "sent" } })).toBe(false)
    expect(
      allSent({ a: { ...sends.a!, status: "sent" }, b: { ...sends.b!, status: "sent" } }),
    ).toBe(true)
    expect(allSent({})).toBe(false)
  })
})
