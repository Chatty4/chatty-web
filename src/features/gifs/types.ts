// The parts of GIPHY's search and trending answers we use.
// https://developers.giphy.com/docs/api/endpoint#search

type GiphyRendition = {
  url: string
  width: string
  height: string
  webp?: string
}

export type GiphyGif = {
  id: string
  title: string
  images: {
    /** About 100px wide: the picker's grid. */
    fixed_width_small: GiphyRendition
    /** Under 5 MB: what is sent, so a GIF never takes long to show. */
    downsized_medium: GiphyRendition
  }
}

export type GiphyResponse = {
  data: GiphyGif[]
  pagination: { total_count: number; count: number; offset: number }
}

/** One page of results, and whether GIPHY has more after it. */
export type GifPage = { gifs: GiphyGif[]; hasMore: boolean }
