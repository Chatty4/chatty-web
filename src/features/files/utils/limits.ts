// The checks chatty-core does on POST /files (api-core.md, D-18), done before the upload so the
// user hears about them at once. chatty-core still checks everything.

import type { FilePurpose } from "../types"

const MB = 1024 * 1024

export const MAX_IMAGE_SIZE = 2 * MB
export const MAX_ATTACHMENT_SIZE = 25 * MB

export const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"]

/** The video types every current browser plays; others (e.g. .mov, .avi) stay files to download. */
export const VIDEO_MIMES = ["video/mp4", "video/webm", "video/ogg"]

const PROGRAM_EXTENSIONS = [
  "exe", "dll", "com", "scr", "cpl", "msi", "msp", "msix", "appx", "bat", "cmd",
  "ps1", "vbs", "vbe", "wsf", "hta", "lnk", "jar", "apk", "dmg", "pkg",
]

const PROGRAM_MIMES = [
  "application/x-msdownload",
  "application/x-msi",
  "application/java-archive",
]

/** The type sent to chatty-core. Browsers leave it empty for types they don't know. */
export function mimeOf(file: File): string {
  return file.type || "application/octet-stream"
}

function isProgram(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  return PROGRAM_EXTENSIONS.includes(extension) || PROGRAM_MIMES.includes(mimeOf(file))
}

/** Why the file can't be uploaded for this purpose, or null when it can. */
export function checkFile(file: File, purpose: FilePurpose): string | null {
  if (isProgram(file)) return "Programs and installers can't be uploaded."
  if (purpose === "attachment") {
    return file.size > MAX_ATTACHMENT_SIZE ? "Files can be at most 25 MB." : null
  }
  if (!IMAGE_MIMES.includes(file.type)) return "Pick a PNG, JPEG, WebP or GIF image."
  return file.size > MAX_IMAGE_SIZE ? "Images can be at most 2 MB." : null
}
