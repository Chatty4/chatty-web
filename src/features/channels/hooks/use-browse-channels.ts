import { useCallback, useEffect, useRef, useState } from "react"

import { browseChannelsRequest } from "../fetchers/channel-fetchers"
import type { BrowsableChannel } from "../types"
import { describeChannelError } from "../utils/errors"

const SEARCH_DEBOUNCE_MS = 250

export type BrowseState =
  | { status: "loading" }
  | {
      status: "loaded"
      channels: BrowsableChannel[]
      /** The filter these pages were fetched with: a cursor only works with the same q. */
      q: string
      nextCursor: string | null
      loadingMore: boolean
    }
  | { status: "error"; message: string }

/** Public channels of the team that I haven't joined, searched and paged on the server. */
export function useBrowseChannels(teamId: string, query: string) {
  const [state, setState] = useState<BrowseState>({ status: "loading" })
  // Only the newest search may write its answer; older ones can arrive after it.
  const generation = useRef(0)

  const search = useCallback(
    (q: string) => {
      const current = ++generation.current
      browseChannelsRequest(teamId, q || undefined)
        .then((res) => {
          if (current !== generation.current) return
          setState({
            status: "loaded",
            channels: res.channels,
            q,
            nextCursor: res.next_cursor,
            loadingMore: false,
          })
        })
        .catch((error: unknown) => {
          if (current === generation.current) {
            setState({ status: "error", message: describeChannelError(error) })
          }
        })
    },
    [teamId],
  )

  useEffect(() => {
    const q = query.trim()
    const timer = setTimeout(() => search(q), q ? SEARCH_DEBOUNCE_MS : 0)
    return () => clearTimeout(timer)
  }, [search, query])

  const refresh = useCallback(() => search(query.trim()), [search, query])

  const loadMore = useCallback(async () => {
    if (state.status !== "loaded" || !state.nextCursor || state.loadingMore) return
    const { q, nextCursor } = state
    const current = generation.current
    setState({ ...state, loadingMore: true })
    try {
      const res = await browseChannelsRequest(teamId, q || undefined, nextCursor)
      if (current !== generation.current) return
      setState((prev) =>
        prev.status === "loaded"
          ? {
              ...prev,
              channels: [...prev.channels, ...res.channels],
              nextCursor: res.next_cursor,
              loadingMore: false,
            }
          : prev,
      )
    } catch (error) {
      if (current !== generation.current) return
      setState((prev) => (prev.status === "loaded" ? { ...prev, loadingMore: false } : prev))
      throw error
    }
  }, [state, teamId])

  return { state, loadMore, refresh }
}
