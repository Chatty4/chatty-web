import { describe, expect, it } from "vitest"

import { previewKind } from "./preview"

const file = (filename: string, mime = "application/octet-stream") => ({ filename, mime })

describe("previewKind", () => {
  it("knows a file by its type", () => {
    expect(previewKind(file("report", "application/pdf"))).toBe("pdf")
    expect(
      previewKind(
        file("x", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      ),
    ).toBe("docx")
    expect(previewKind(file("notes", "text/markdown"))).toBe("markdown")
    expect(previewKind(file("data", "text/csv; charset=utf-8"))).toBe("table")
    expect(previewKind(file("song", "audio/mpeg"))).toBe("audio")
  })

  it("falls back to the extension when the browser sent no useful type", () => {
    expect(previewKind(file("README.md"))).toBe("markdown")
    expect(previewKind(file("export.CSV"))).toBe("table")
    expect(previewKind(file("main.py"))).toBe("text")
    expect(previewKind(file("Report.PDF"))).toBe("pdf")
  })

  it("shows any other text type as text", () => {
    expect(previewKind(file("x", "text/x-diff"))).toBe("text")
  })

  it("shows HTML as its source, and SVG only as a picture", () => {
    expect(previewKind(file("page.html", "text/html"))).toBe("text")
    expect(previewKind(file("logo.svg", "image/svg+xml"))).toBe("image")
  })

  it("has no preview for archives, spreadsheets, slides and unknown files", () => {
    expect(previewKind(file("backup.zip", "application/zip"))).toBeNull()
    expect(previewKind(file("budget.xlsx"))).toBeNull()
    expect(previewKind(file("deck.pptx"))).toBeNull()
    expect(previewKind(file("blob"))).toBeNull()
    expect(previewKind(file(".env"))).toBeNull()
  })
})
