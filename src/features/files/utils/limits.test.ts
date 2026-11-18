import { describe, expect, it } from "vitest"

import { checkFile, MAX_ATTACHMENT_SIZE, MAX_IMAGE_SIZE, mimeOf } from "./limits"

function fileOf(name: string, type: string, size = 10): File {
  const file = new File(["x"], name, { type })
  Object.defineProperty(file, "size", { value: size })
  return file
}

describe("checkFile", () => {
  it("accepts any attachment up to 25 MB", () => {
    expect(checkFile(fileOf("report.pdf", "application/pdf", MAX_ATTACHMENT_SIZE), "attachment")).toBeNull()
    expect(checkFile(fileOf("report.pdf", "application/pdf", MAX_ATTACHMENT_SIZE + 1), "attachment")).toContain("25 MB")
  })

  it("refuses programs by extension, in any case, and by type", () => {
    expect(checkFile(fileOf("setup.EXE", ""), "attachment")).toContain("Programs")
    expect(checkFile(fileOf("app", "application/java-archive"), "attachment")).toContain("Programs")
  })

  it("takes only the four image types up to 2 MB for an avatar", () => {
    expect(checkFile(fileOf("me.png", "image/png", MAX_IMAGE_SIZE), "avatar")).toBeNull()
    expect(checkFile(fileOf("me.png", "image/png", MAX_IMAGE_SIZE + 1), "avatar")).toContain("2 MB")
    expect(checkFile(fileOf("me.svg", "image/svg+xml"), "avatar")).toContain("PNG")
  })
})

describe("mimeOf", () => {
  it("falls back to octet-stream when the browser doesn't know the type", () => {
    expect(mimeOf(fileOf("notes.xyz", ""))).toBe("application/octet-stream")
  })
})
