import { describe, expect, it } from "vitest"

import type { GiphyGif } from "../types"
import { appendNewGifs } from "./pages"

const gif = (id: string) => ({ id }) as GiphyGif

describe("appendNewGifs", () => {
  it("adds the page in order and drops GIFs already shown", () => {
    const result = appendNewGifs([gif("a"), gif("b")], [gif("b"), gif("c"), gif("d")])
    expect(result.map((g) => g.id)).toEqual(["a", "b", "c", "d"])
  })
})
