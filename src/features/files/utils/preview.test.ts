import { describe, expect, it } from "vitest"

import { isAudioFile, previewKind } from "./preview"

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

describe("isAudioFile", () => {
  it("knows sound files by type, or by name when the type says nothing", () => {
    expect(isAudioFile({ mime: "audio/mpeg", filename: "song" })).toBe(true)
    expect(isAudioFile({ mime: "audio/x-m4a", filename: "a.m4a" })).toBe(true)
    expect(isAudioFile({ mime: "application/octet-stream", filename: "Voice.M4A" })).toBe(true)
    expect(isAudioFile({ mime: "application/pdf", filename: "a.pdf" })).toBe(false)
    expect(isAudioFile({ mime: "video/mp4", filename: "clip.mp4" })).toBe(false)
  })
})
