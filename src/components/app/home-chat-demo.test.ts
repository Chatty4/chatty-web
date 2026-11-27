import { describe, expect, it } from "vitest"

import { MESSAGES, next } from "./home-chat-demo-script"

describe("home chat demo loop", () => {
  it("types before marked messages, shows them all, moves up, then starts over", () => {
    let state = next({ shown: 0, typing: false, phase: "reset" })[0]
    const typedAt: number[] = []

    while (state.phase === "play") {
      if (state.typing) typedAt.push(state.shown)
      state = next(state)[0]
    }

    expect(typedAt).toEqual(MESSAGES.flatMap((m, i) => (m.typing ? [i] : [])))
    expect(state).toEqual({ shown: MESSAGES.length, typing: false, phase: "leave" })
    expect(next(state)[0]).toEqual({ shown: 0, typing: false, phase: "reset" })
  })
})
