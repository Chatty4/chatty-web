import { describe, expect, it } from "vitest"

import { parseTable } from "./table"

describe("parseTable", () => {
  it("splits a CSV into its header and rows", () => {
    expect(parseTable("name,team\nAna,web\nBob,chat\n")).toEqual({
      header: ["name", "team"],
      rows: [
        ["Ana", "web"],
        ["Bob", "chat"],
      ],
      totalRows: 2,
    })
  })

  it("detects tabs and keeps quoted commas and line breaks", () => {
    expect(parseTable("a\tb\n1\t2").rows).toEqual([["1", "2"]])
    expect(parseTable('note,by\n"Hi, all\nsee you",Ana').rows).toEqual([["Hi, all\nsee you", "Ana"]])
  })

  it("keeps the first rows of a long file and counts all of them", () => {
    const table = parseTable("n\n1\n2\n3\n4", { maxRows: 2 })
    expect(table.rows).toEqual([["1"], ["2"]])
    expect(table.totalRows).toBe(4)
  })

  it("drops the last line of a file read in part", () => {
    expect(parseTable("n\n1\n2\n3", { cut: true }).rows).toEqual([["1"], ["2"]])
  })

  it("has no header for an empty file", () => {
    expect(parseTable("")).toEqual({ header: [], rows: [], totalRows: 0 })
  })
})
