import { describe, expect, it } from "vitest"

import { MESSAGES, messageAt, next, START } from "./home-chat-demo-script"

describe("home chat demo loop", () => {
  it("types before marked messages and keeps going around the script", () => {
    let state = START
    const typedAt: number[] = []

    while (state.shown < START.shown + MESSAGES.length * 2) {
      if (state.typing) typedAt.push(state.shown)
      state = next(state)[0]
    }

    const expected = Array.from({ length: MESSAGES.length * 2 }, (_, k) => START.shown + k).filter(
      (i) => messageAt(i).typing,
    )
    expect(typedAt).toEqual(expected)
    expect(messageAt(MESSAGES.length)).toBe(MESSAGES[0])
  })
})
