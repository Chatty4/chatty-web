// Runs the compression worker on one image. Never rejects: anything that goes wrong (an old
// browser, a file it can't decode, a slow device) sends the original, as before.

import type { CompressRequest, CompressResponse } from "../workers/compress.worker"
import type { FilePurpose } from "../types"
import { compressedName, shouldCompress, smallerOf, targetFor } from "./compress"

/** Past this, the original is sent: compression must never hold an upload back for long. */
const TIMEOUT_MS = 20_000

function canCompress(): boolean {
  return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined"
}

/** The image shrunk and re-encoded for this kind of upload, or the original when that doesn't pay. */
export async function compressImage(file: File, purpose: FilePurpose): Promise<File> {
  if (!shouldCompress(file) || !canCompress()) return file
  try {
    const image = await encodeInWorker({ image: file, ...targetFor(purpose) })
    const compressed = new File([image], compressedName(file.name, image.type), {
      type: image.type,
      lastModified: file.lastModified,
    })
    return smallerOf(file, compressed)
  } catch {
    return file
  }
}

function encodeInWorker(request: CompressRequest): Promise<Blob> {
  // One worker per image, ended right after: images are picked a few at a time, and an idle
  // worker would hold the decoder's memory.
  const worker = new Worker(new URL("../workers/compress.worker.ts", import.meta.url), {
    type: "module",
  })
  let timer: ReturnType<typeof setTimeout> | undefined
  return new Promise<Blob>((resolve, reject) => {
    timer = setTimeout(() => reject(new Error("Compression timed out")), TIMEOUT_MS)
    worker.onmessage = ({ data }: MessageEvent<CompressResponse>) => {
      if (data.ok) resolve(data.image)
      else reject(new Error("Compression failed"))
    }
    worker.onerror = () => reject(new Error("Compression worker failed"))
    worker.postMessage(request)
  }).finally(() => {
    clearTimeout(timer)
    worker.terminate()
  })
}
