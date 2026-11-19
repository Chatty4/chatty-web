import type { GiphyGif } from "../types"

/** Adds a page under the GIFs already shown. GIPHY can repeat a GIF across pages: keep the first. */
export function appendNewGifs(shown: GiphyGif[], page: GiphyGif[]): GiphyGif[] {
  const ids = new Set(shown.map((gif) => gif.id))
  return [...shown, ...page.filter((gif) => !ids.has(gif.id))]
}
