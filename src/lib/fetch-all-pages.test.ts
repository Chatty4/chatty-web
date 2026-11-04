import { describe, expect, it, vi } from "vitest"

import { fetchAllPages } from "./fetch-all-pages"

describe("fetchAllPages", () => {
  it("follows next_cursor to the last page", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [1, 2], next_cursor: "b" })
      .mockResolvedValueOnce({ items: [3], next_cursor: null })

    await expect(fetchAllPages(fetchPage)).resolves.toEqual([1, 2, 3])
    expect(fetchPage).toHaveBeenNthCalledWith(1, undefined)
    expect(fetchPage).toHaveBeenNthCalledWith(2, "b")
  })

  it("rejects when a page fails", async () => {
    const fetchPage = vi.fn().mockRejectedValue(new Error("down"))
    await expect(fetchAllPages(fetchPage)).rejects.toThrow("down")
  })
})
