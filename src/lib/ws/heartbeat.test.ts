import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createHeartbeat, HEARTBEAT_MS } from "./heartbeat"
import type { HeartbeatMessage } from "./types"

function setup(visible = true) {
  const sent: HeartbeatMessage[] = []
  const tab = { visible }
  const heartbeat = createHeartbeat({
    send: (message) => sent.push(message),
    isVisible: () => tab.visible,
  })
  return { sent, tab, heartbeat }
}

describe("createHeartbeat", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([true, false])("sends one heartbeat right away on start (visible %s)", (visible) => {
    const { heartbeat, sent } = setup(visible)
    heartbeat.start()
    expect(sent).toEqual([{ type: "heartbeat", visible }])
  })

  it("then sends one every 20 s with the visibility at that moment", () => {
    const { heartbeat, sent, tab } = setup(true)
    heartbeat.start()

    tab.visible = false
    vi.advanceTimersByTime(HEARTBEAT_MS - 1)
    expect(sent).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(sent).toEqual([
      { type: "heartbeat", visible: true },
      { type: "heartbeat", visible: false },
    ])
  })

  it("keeps one timer when started twice", () => {
    const { heartbeat, sent } = setup()
    heartbeat.start()
    heartbeat.start()

    vi.advanceTimersByTime(HEARTBEAT_MS)
    expect(sent).toHaveLength(2)
  })

  it("beat sends now without starting the timer", () => {
    const { heartbeat, sent, tab } = setup(true)
    tab.visible = false
    heartbeat.beat()

    vi.advanceTimersByTime(HEARTBEAT_MS * 2)
    expect(sent).toEqual([{ type: "heartbeat", visible: false }])
  })

  it("sends nothing after stop", () => {
    const { heartbeat, sent } = setup()
    heartbeat.start()
    heartbeat.stop()

    vi.advanceTimersByTime(HEARTBEAT_MS * 2)
    expect(sent).toHaveLength(1)
  })
})
