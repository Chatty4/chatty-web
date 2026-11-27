import { describe, expect, it } from "vitest"

import {
  ATTACHMENT_MAX_SIDE,
  compressedName,
  COMPRESS_QUALITY,
  fitWithin,
  ICON_MAX_SIDE,
  MIN_COMPRESS_BYTES,
  shouldCompress,
  smallerOf,
  targetFor,
} from "./compress"

const KB = 1024

function fileOf(size: number, name = "photo.jpg", type = "image/jpeg"): File {
  return new File([new Uint8Array(size)], name, { type })
}

describe("targetFor", () => {
  it("shrinks attachments to 2560 px and avatars and team icons to 512 px", () => {
    expect(targetFor("attachment")).toEqual({ maxSide: 2560, quality: COMPRESS_QUALITY })
    expect(targetFor("avatar").maxSide).toBe(ICON_MAX_SIDE)
    expect(targetFor("team_icon").maxSide).toBe(512)
    expect(ATTACHMENT_MAX_SIDE).toBe(2560)
  })
})

describe("shouldCompress", () => {
  it("compresses JPEG, PNG and WebP photos of 300 KB or more", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(shouldCompress({ type, size: MIN_COMPRESS_BYTES })).toBe(true)
    }
  })

  it("skips small files", () => {
    expect(shouldCompress({ type: "image/jpeg", size: 299 * KB })).toBe(false)
  })

  it("skips GIFs, SVGs and anything that isn't a photo", () => {
    for (const type of ["image/gif", "image/svg+xml", "image/heic", "application/pdf", ""]) {
      expect(shouldCompress({ type, size: 5_000 * KB })).toBe(false)
    }
  })
})

describe("fitWithin", () => {
  it("caps the long side and keeps the aspect ratio", () => {
    expect(fitWithin(4032, 3024, 2560)).toEqual({ width: 2560, height: 1920 })
    expect(fitWithin(3024, 4032, 512)).toEqual({ width: 384, height: 512 })
  })

  it("never makes an image bigger", () => {
    expect(fitWithin(800, 600, 2560)).toEqual({ width: 800, height: 600 })
  })

  it("keeps at least one pixel on a very thin image", () => {
    expect(fitWithin(10_000, 2, 512)).toEqual({ width: 512, height: 1 })
  })
})

describe("compressedName", () => {
  it("swaps the extension for the new type", () => {
    expect(compressedName("IMG_2041.jpg", "image/webp")).toBe("IMG_2041.webp")
    expect(compressedName("scan.final.PNG", "image/jpeg")).toBe("scan.final.jpg")
  })

  it("adds one to a name without an extension", () => {
    expect(compressedName("photo", "image/webp")).toBe("photo.webp")
    expect(compressedName(".hidden", "image/webp")).toBe(".hidden.webp")
  })
})

describe("smallerOf", () => {
  it("keeps the compressed file only when it is smaller", () => {
    const original = fileOf(900 * KB)
    const smaller = fileOf(200 * KB, "photo.webp", "image/webp")
    const bigger = fileOf(950 * KB, "photo.webp", "image/webp")
    expect(smallerOf(original, smaller)).toBe(smaller)
    expect(smallerOf(original, bigger)).toBe(original)
    expect(smallerOf(original, fileOf(900 * KB, "photo.webp", "image/webp"))).toBe(original)
  })
})
