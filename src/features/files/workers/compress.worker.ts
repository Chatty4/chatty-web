// Decodes, resizes and re-encodes one image off the main thread, so the composer stays
// responsive while a large photo is shrunk. Only the pixels are drawn: EXIF (location, camera,
// date) doesn't make it into the new file. The orientation is applied first, so photos aren't
// sideways.

import { fitWithin, type CompressTarget } from "../utils/compress"

export type CompressRequest = { image: Blob } & CompressTarget
export type CompressResponse = { ok: true; image: Blob } | { ok: false }

// The DOM types don't describe a worker's global scope; this is the part used here.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<CompressRequest>) => void) | null
  postMessage: (message: CompressResponse) => void
}

scope.onmessage = async ({ data }) => {
  try {
    scope.postMessage({ ok: true, image: await compress(data) })
  } catch {
    scope.postMessage({ ok: false })
  }
}

async function compress({ image, maxSide, quality }: CompressRequest): Promise<Blob> {
  const bitmap = await createImageBitmap(image, { imageOrientation: "from-image" })
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide)
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext("2d")
  if (!context) throw new Error("No 2D canvas")
  context.imageSmoothingQuality = "high"
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const webp = await canvas.convertToBlob({ type: "image/webp", quality })
  if (webp.type === "image/webp") return webp

  // A browser that can't write WebP (Safari may hand back a PNG) gets JPEG. JPEG has no
  // transparency, so transparent pixels go white instead of black.
  context.globalCompositeOperation = "destination-over"
  context.fillStyle = "#fff"
  context.fillRect(0, 0, width, height)
  return canvas.convertToBlob({ type: "image/jpeg", quality })
}
