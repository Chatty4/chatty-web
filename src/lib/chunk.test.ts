import { describe, expect, it } from "vitest"

import { chunk } from "./chunk"

describe("chunk", () => {
  it("splits into pieces of the given size, the last one shorter", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it("returns nothing for an empty list", () => {
    expect(chunk([], 100)).toEqual([])
  })
})
