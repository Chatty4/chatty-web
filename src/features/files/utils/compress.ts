// Images are compressed in the browser before upload, the usual way: resize, re-encode as WebP,
// and drop the metadata (location, camera, date) by drawing the pixels only. The rules live
// here; the drawing runs in a worker (compress-image.ts). chatty-core still checks every file.

import type { FilePurpose } from "../types"

/** The long side of an attachment, in px. */
export const ATTACHMENT_MAX_SIDE = 2560

/** The long side of an avatar or team icon, in px: they show at 32–80 px. */
export const ICON_MAX_SIDE = 512

/** WebP (and JPEG) quality: a photo looks the same, at a fraction of the size. */
export const COMPRESS_QUALITY = 0.82

/** Smaller files are sent as they are: there is little to gain. */
export const MIN_COMPRESS_BYTES = 300 * 1024

/**
 * Photos only. GIFs would lose their animation, SVGs are drawings, not pixels, and other types
 * (HEIC, AVIF, …) aren't decoded by every browser.
 */
const COMPRESSIBLE_TYPES = ["image/jpeg", "image/png", "image/webp"]

const EXTENSIONS: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg" }

export type CompressTarget = { maxSide: number; quality: number }

/** How far an image is shrunk for this kind of upload. */
export function targetFor(purpose: FilePurpose): CompressTarget {
  const maxSide = purpose === "attachment" ? ATTACHMENT_MAX_SIDE : ICON_MAX_SIDE
  return { maxSide, quality: COMPRESS_QUALITY }
}

/** True for a JPEG, PNG or WebP of 300 KB or more. */
export function shouldCompress(file: { type: string; size: number }): boolean {
  return COMPRESSIBLE_TYPES.includes(file.type) && file.size >= MIN_COMPRESS_BYTES
}

/** The size that fits `maxSide` on the long side, same aspect ratio, never bigger. */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** "IMG_2041.jpg" → "IMG_2041.webp": the same name, with the extension of the new type. */
export function compressedName(name: string, type: string): string {
  const extension = EXTENSIONS[type] ?? "webp"
  const dot = name.lastIndexOf(".")
  return `${dot > 0 ? name.slice(0, dot) : name}.${extension}`
}

/** The compressed file only when it is actually smaller; otherwise the original. */
export function smallerOf(original: File, compressed: File): File {
  return compressed.size < original.size ? compressed : original
}
