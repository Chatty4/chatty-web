import { Popover } from "@base-ui/react/popover"
import { type RefObject, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { GIPHY_API_KEY } from "@/lib/config"

import { useGifSearch } from "../hooks/use-gif-search"
import type { GiphyGif } from "../types"

type GifPickerButtonProps = {
  /** Called with the GIF's link, which is sent as the message body. */
  onSelect: (url: string) => void
  disabled?: boolean
  /** Element to focus after the picker closes (the composer textarea). */
  returnFocusRef?: RefObject<HTMLElement | null>
}

/** "GIF" button that opens a GIPHY search; picking one sends it. Hidden without an API key. */
export function GifPickerButton({ onSelect, disabled, returnFocusRef }: GifPickerButtonProps) {
  const [open, setOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  if (!GIPHY_API_KEY) return null

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Send a GIF"
            disabled={disabled}
            className={open ? "bg-surface-hover text-foreground" : undefined}
          />
        }
      >
        <span className="text-[10px] font-bold tracking-wide">GIF</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="start" sideOffset={8} className="z-50">
          <Popover.Popup
            initialFocus={searchRef}
            finalFocus={returnFocusRef ?? true}
            className="origin-[var(--transform-origin)] overflow-hidden rounded-md border bg-surface shadow-xl outline-none transition-[transform,opacity] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
          >
            <GifPicker
              searchRef={searchRef}
              onSelect={(gif) => {
                onSelect(gif.images.downsized_medium.url)
                setOpen(false)
              }}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function GifPicker({
  searchRef,
  onSelect,
}: {
  searchRef: RefObject<HTMLInputElement | null>
  onSelect: (gif: GiphyGif) => void
}) {
  const [query, setQuery] = useState("")
  const { state: search, loadMore } = useGifSearch(query, true)

  return (
    <div className="flex h-[400px] w-[340px] flex-col bg-surface">
      <div className="border-b p-2">
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search GIFs"
          placeholder="Search GIPHY…"
          className="h-8 w-full rounded-sm border border-input bg-surface px-2.5 text-sm text-foreground outline-none placeholder:text-faint-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto p-1.5"
        onScroll={(e) => {
          // About two rows before the end, so the next page is there when they get to it.
          const el = e.currentTarget
          if (el.scrollTop + el.clientHeight > el.scrollHeight - 200) loadMore()
        }}
      >
        {search.status === "loading" && <Note>Loading…</Note>}
        {search.status === "error" && <Note>GIFs can't be loaded right now.</Note>}
        {search.status === "loaded" && search.gifs.length === 0 && <Note>No GIFs found.</Note>}
        {search.status === "loaded" && search.gifs.length > 0 && (
          <ul aria-label={query.trim() ? "GIF results" : "Trending GIFs"} className="grid grid-cols-3 gap-1.5">
            {search.gifs.map((gif) => {
              const preview = gif.images.fixed_width_small
              return (
                <li key={gif.id}>
                  <button
                    type="button"
                    aria-label={gif.title || "GIF"}
                    title={gif.title}
                    onClick={() => onSelect(gif)}
                    className="block h-24 w-full overflow-hidden rounded-sm bg-surface-hover outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <img
                      src={preview.webp ?? preview.url}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {search.status === "loaded" && search.loadingMore && (
          <p className="py-2 text-center text-xs text-muted-foreground">Loading more…</p>
        )}
      </div>

      {/* GIPHY's terms ask for this wherever its results show. */}
      <div className="flex h-8 shrink-0 items-center justify-end border-t px-3 text-[11px] font-semibold text-muted-foreground">
        Powered by GIPHY
      </div>
    </div>
  )
}

function Note({ children }: { children: string }) {
  return <p className="grid h-full place-items-center text-sm text-muted-foreground">{children}</p>
}
