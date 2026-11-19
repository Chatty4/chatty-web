import { useCallback, useEffect, useRef, useState } from "react"

import { searchGifs } from "../fetchers/gif-fetchers"
import type { GiphyGif } from "../types"
import { appendNewGifs } from "../utils/pages"

export type GifSearchState =
  | { status: "loading" }
  | { status: "loaded"; gifs: GiphyGif[]; hasMore: boolean; loadingMore: boolean }
  | { status: "error" }

const DEBOUNCE_MS = 300

/**
 * GIPHY results for `query` (trending when empty), searched once typing pauses. `loadMore`
 * fetches the next page, for scrolling down the picker.
 */
export function useGifSearch(query: string, enabled: boolean) {
  const [state, setState] = useState<GifSearchState>({ status: "loading" })
  // Bumped by every new query, so a page for an older one is dropped.
  const generation = useRef(0)

  useEffect(() => {
    if (!enabled) return
    const current = ++generation.current
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setState({ status: "loading" })
      searchGifs(query, 0, controller.signal)
        .then(({ gifs, hasMore }) => setState({ status: "loaded", gifs, hasMore, loadingMore: false }))
        .catch(() => {
          if (current === generation.current) setState({ status: "error" })
        })
    }, DEBOUNCE_MS)
    // A newer query cancels the wait, or the request already sent.
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, enabled])

  const loadMore = useCallback(() => {
    if (state.status !== "loaded" || !state.hasMore || state.loadingMore) return
    const current = generation.current
    setState({ ...state, loadingMore: true })
    searchGifs(query, state.gifs.length)
      .then(({ gifs, hasMore }) => {
        if (current !== generation.current) return
        setState((prev) =>
          prev.status === "loaded"
            ? { status: "loaded", gifs: appendNewGifs(prev.gifs, gifs), hasMore, loadingMore: false }
            : prev,
        )
      })
      .catch(() => {
        // Stop asking: a failing page would be fetched again on every scroll.
        if (current !== generation.current) return
        setState((prev) => (prev.status === "loaded" ? { ...prev, hasMore: false, loadingMore: false } : prev))
      })
  }, [query, state])

  return { state, loadMore }
}
