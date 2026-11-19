import { useEffect, useState } from "react"

import { searchGifs } from "../fetchers/gif-fetchers"
import type { GiphyGif } from "../types"

export type GifSearchState =
  | { status: "loading" }
  | { status: "loaded"; gifs: GiphyGif[] }
  | { status: "error" }

const DEBOUNCE_MS = 300

/** GIPHY results for `query` (trending when empty), searched once typing pauses. */
export function useGifSearch(query: string, enabled: boolean): GifSearchState {
  const [state, setState] = useState<GifSearchState>({ status: "loading" })

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setState({ status: "loading" })
      searchGifs(query, controller.signal)
        .then((gifs) => setState({ status: "loaded", gifs }))
        .catch(() => {
          if (!controller.signal.aborted) setState({ status: "error" })
        })
    }, DEBOUNCE_MS)
    // A newer query cancels the wait, or the request already sent.
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, enabled])

  return state
}
