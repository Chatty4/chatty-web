// GIPHY, called straight from the browser: chatty-chat isn't involved (the key is public anyway).

import { ApiError, networkError } from "@/lib/api-error"
import { GIPHY_API_KEY } from "@/lib/config"

import type { GiphyGif, GiphyResponse } from "../types"

const GIPHY_API = "https://api.giphy.com/v1/gifs"
// shortcut: one page of results, no infinite scroll; add `offset` paging if people ask for more.
const LIMIT = 30

/** Trending GIFs when `query` is empty, otherwise the search results. */
export async function searchGifs(query: string, signal?: AbortSignal): Promise<GiphyGif[]> {
  const params = new URLSearchParams({ api_key: GIPHY_API_KEY, limit: String(LIMIT), rating: "pg-13" })
  const q = query.trim()
  if (q) params.set("q", q)
  const url = `${GIPHY_API}/${q ? "search" : "trending"}?${params}`

  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw networkError()
  }
  if (!response.ok) throw new ApiError(response.status, `giphy_${response.status}`, response.statusText)
  return ((await response.json()) as GiphyResponse).data
}
