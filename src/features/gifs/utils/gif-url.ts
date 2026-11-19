// A GIF is sent as a message whose whole body is its GIPHY link. Only GIPHY's own media hosts
// count, over https, so a message can't make every reader load an image from anywhere.

const GIPHY_MEDIA_HOST = /^(media\d*|i)\.giphy\.com$/

/** True when the message body is just a GIPHY media link, so it shows as a GIF. */
export function isGifMessage(body: string): boolean {
  const text = body.trim()
  if (/\s/.test(text)) return false
  try {
    const url = new URL(text)
    return url.protocol === "https:" && GIPHY_MEDIA_HOST.test(url.hostname)
  } catch {
    return false
  }
}
