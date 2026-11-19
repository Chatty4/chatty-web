// GIPHY, called straight from the browser: chatty-chat isn't involved (the key is public anyway).

import { ApiError, networkError } from "@/lib/api-error"
import { GIPHY_API_KEY } from "@/lib/config"

import type { GifPage, GiphyResponse } from "../types"

const GIPHY_API = "https://api.giphy.com/v1/gifs"
export const GIF_PAGE_SIZE = 30

/** Trending GIFs when `query` is empty, otherwise the search results, from `offset` on. */
export async function searchGifs(query: string, offset: number, signal?: AbortSignal): Promise<GifPage> {
  const params = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    limit: String(GIF_PAGE_SIZE),
    offset: String(offset),
    rating: "pg-13",
  })
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
  const { data, pagination } = (await response.json()) as GiphyResponse
  return { gifs: data, hasMore: pagination.offset + pagination.count < pagination.total_count }
}
