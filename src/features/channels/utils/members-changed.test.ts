import { describe, expect, it, vi } from "vitest"

import { notifyMembersChanged, subscribeMembersChanged } from "./members-changed"

describe("members changed", () => {
  it("tells every listener which channel changed", () => {
    const first = vi.fn()
    const second = vi.fn()
    const stopFirst = subscribeMembersChanged(first)
    const stopSecond = subscribeMembersChanged(second)

    notifyMembersChanged("c1")

    expect(first).toHaveBeenCalledWith("c1")
    expect(second).toHaveBeenCalledWith("c1")
    stopFirst()
    stopSecond()
  })

  it("stops telling a listener that unsubscribed", () => {
    const listener = vi.fn()
    const stop = subscribeMembersChanged(listener)
    stop()

    notifyMembersChanged("c1")

    expect(listener).not.toHaveBeenCalled()
  })
})
