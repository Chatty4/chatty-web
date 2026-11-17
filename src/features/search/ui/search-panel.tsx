import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { Loader2, Search } from "lucide-react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { SidePanel } from "@/components/ui/side-panel"
import { useAuth } from "@/features/auth"
import { dmDisplayName, useChannels } from "@/features/channels"
import { useMessages } from "@/features/messages"
import { useMemberNames } from "@/features/messages/hooks/use-member-names"
import { extractMentionIds } from "@/features/messages/utils/mentions"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

import { searchMessages, type SearchFilters } from "../fetchers/search-fetchers"
import type { SearchResult } from "../types"
import { dateRangeError, toDateRange, type DateFilter, type DatePreset } from "../utils/date-range"
import { parseHighlight, showMentions } from "../utils/highlight"
import { AuthorPicker, type Author } from "./author-picker"

const MIN_LENGTH = 2
const MAX_LENGTH = 200

const dateFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

type Status = "idle" | "loading" | "loaded" | "error"

type Filters = { channelId: string; author: Author | null; date: DateFilter }

const NO_FILTERS: Filters = { channelId: "", author: null, date: { preset: "any", from: "", to: "" } }

const hasFilters = (f: Filters) => !!f.channelId || !!f.author || f.date.preset !== "any"

const toParams = (f: Filters): SearchFilters => ({
  in: f.channelId || undefined,
  from: f.author?.id,
  ...toDateRange(f.date),
})

export type SearchPanelProps = {
  teamId: string
  /** The open channel; a result in another one opens that channel. */
  channelId: string
  onClose: () => void
}

/** Full-text search in the team's messages, with filters. Click a result to jump to it. */
export function SearchPanel({ teamId, channelId, onClose }: SearchPanelProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { jumpTo } = useMessages()
  const { channels, dms, memberNames: dmNames } = useChannels()

  const [input, setInput] = useState("")
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [results, setResults] = useState<SearchResult[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [inputError, setInputError] = useState<string | null>(null)
  // Only the newest request may write: an older answer arriving late is ignored.
  const requestRef = useRef<AbortController | null>(null)
  // "More results" must send the q and filters its cursor was made for.
  const activeRef = useRef<{ q: string; params: SearchFilters } | null>(null)

  const run = async (q: string, params: SearchFilters, cursor?: string) => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    activeRef.current = { q, params }
    setStatus("loading")
    try {
      const page = await searchMessages(teamId, q, params, cursor, controller.signal)
      setResults((previous) => (cursor ? [...previous, ...page.results] : page.results))
      setNextCursor(page.next_cursor)
      setStatus("loaded")
    } catch {
      if (controller.signal.aborted) return
      setStatus("error")
      if (!cursor) setResults([])
    }
  }

  const dateError = dateRangeError(filters.date)

  const search = (q: string, next: Filters) => {
    if (dateRangeError(next.date)) return
    setNextCursor(null)
    void run(q, toParams(next))
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const q = input.trim()
    if (q.length < MIN_LENGTH) {
      setInputError(`Type at least ${MIN_LENGTH} characters.`)
      return
    }
    setInputError(null)
    setQuery(q)
    search(q, filters)
  }

  // A filter change searches again right away, once there is something to search for.
  const changeFilters = (next: Filters) => {
    setFilters(next)
    if (query) search(query, next)
  }
  const setDate = (date: Partial<DateFilter>) =>
    changeFilters({ ...filters, date: { ...filters.date, ...date } })

  const userIds = useMemo(
    () => [
      ...new Set(
        results.flatMap((r) => [r.message.author_id, ...extractMentionIds(r.message.body)]),
      ),
    ],
    [results],
  )
  const names = useMemberNames(teamId, userIds)

  const dmName = (dmMemberIds: string[] | null | undefined) =>
    dmDisplayName(dmMemberIds ?? [], user?.id ?? "", { ...dmNames, ...names })

  const channelLabel = (id: string) => {
    const channel = [...channels, ...dms].find((c) => c.id === id)
    if (!channel) return "#channel"
    return channel.kind === "dm" ? `DM with ${dmName(channel.dm_member_ids)}` : `#${channel.name ?? ""}`
  }

  const sortedChannels = useMemo(
    () => [...channels].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
    [channels],
  )

  const open = async ({ message }: SearchResult) => {
    // Keeps the panel open in the other channel, so the user can try the next result.
    if (message.channel_id !== channelId) {
      navigate(`/teams/${teamId}/channels/${message.channel_id}?search`)
    }
    if (!(await jumpTo(message.channel_id, message.id, message.seq))) {
      toast.error("Couldn't load this message. Try again.")
      return
    }
    // On small screens the panel covers the list, so get out of the way.
    if (window.matchMedia("(max-width: 767px)").matches) onClose()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLLIElement>, result: SearchResult) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      void open(result)
    }
  }

  const filtered = hasFilters(filters)

  return (
    <SidePanel title="Search" subtitle="Messages in this team" closeLabel="Close search" onClose={onClose}>
      <div className="flex shrink-0 flex-col gap-3 border-b p-[18px]">
        <form onSubmit={submit} className="flex gap-2" role="search">
          <Input
            autoFocus
            value={input}
            maxLength={MAX_LENGTH}
            placeholder="Search messages"
            aria-label="Search messages"
            aria-invalid={!!inputError}
            aria-describedby={inputError ? "search-error" : undefined}
            onChange={(event) => {
              setInput(event.target.value)
              setInputError(null)
            }}
          />
          <Button type="submit" size="icon" aria-label="Search" disabled={status === "loading"}>
            <Search className="size-[17px]" />
          </Button>
        </form>
        {inputError && (
          <span id="search-error" role="alert" className="-mt-1 text-xs text-destructive">
            {inputError}
          </span>
        )}

        <div className="grid grid-cols-2 gap-2" aria-label="Filters" role="group">
          <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
            In
            <Select
              value={filters.channelId}
              onChange={(e) => changeFilters({ ...filters, channelId: e.target.value })}
            >
              <option value="">Anywhere</option>
              <option value={channelId}>This conversation</option>
              {sortedChannels.length > 0 && (
                <optgroup label="Channels">
                  {sortedChannels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {dms.length > 0 && (
                <optgroup label="Direct messages">
                  {dms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {dmName(c.dm_member_ids)}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
            Date
            <Select
              value={filters.date.preset}
              onChange={(e) => setDate({ preset: e.target.value as DatePreset })}
            >
              <option value="any">Any time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom range…</option>
            </Select>
          </label>
          {/* A div, not a label: the picker labels its own input, and a label would steal clicks. */}
          <div className="col-span-2 flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
            <span aria-hidden="true">From</span>
            <AuthorPicker
              teamId={teamId}
              myId={user?.id}
              value={filters.author}
              onChange={(author) => changeFilters({ ...filters, author })}
            />
          </div>
        </div>

        {filters.date.preset === "custom" && (
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              From date
              <Input
                type="date"
                value={filters.date.from}
                max={filters.date.to || undefined}
                aria-invalid={!!dateError}
                onChange={(e) => setDate({ from: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              To date
              <Input
                type="date"
                value={filters.date.to}
                min={filters.date.from || undefined}
                aria-invalid={!!dateError}
                onChange={(e) => setDate({ to: e.target.value })}
              />
            </label>
            {dateError && (
              <span role="alert" className="col-span-2 text-xs text-destructive">
                {dateError}
              </span>
            )}
          </div>
        )}

        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={() => changeFilters(NO_FILTERS)}
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-[18px]">
        {status === "idle" && (
          <p className="text-center text-xs text-muted-foreground">
            Search words in messages. Narrow down with the filters above.
          </p>
        )}

        {status === "loading" && results.length === 0 && (
          <span role="status" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Searching…
          </span>
        )}

        {status === "error" && results.length === 0 && (
          <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 text-center">
            <strong className="font-semibold">Couldn't search.</strong>
            <Button variant="secondary" size="sm" onClick={() => search(query, filters)}>
              Try again
            </Button>
          </div>
        )}

        {status === "loaded" && results.length === 0 && (
          <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <strong className="text-foreground">No results</strong>
            <span>{filtered ? "Try other words, or fewer filters." : "Try other words."}</span>
            {filtered && (
              <Button variant="secondary" size="sm" onClick={() => changeFilters(NO_FILTERS)}>
                Clear filters
              </Button>
            )}
          </div>
        )}

        {results.length > 0 && (
          <ul
            className={cn("flex flex-col gap-[9px]", status === "loading" && "opacity-60")}
            aria-label={`Results for ${query}`}
            aria-busy={status === "loading"}
          >
            {results.map((result) => {
              const own = result.message.author_id === user?.id
              return (
                <li
                  key={result.message.id}
                  tabIndex={0}
                  role="button"
                  onClick={() => void open(result)}
                  onKeyDown={(event) => handleKeyDown(event, result)}
                  className={cn(
                    "cursor-pointer rounded-md border p-3 focus-visible:outline-2 focus-visible:outline-ring",
                    // The light blue of my own bubbles in the chat.
                    own ? "border-primary/30 bg-accent hover:bg-accent/70" : "hover:bg-surface-hover",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">
                      <strong className="font-semibold text-foreground">
                        {own ? "You" : (names[result.message.author_id] ?? "Unknown member")}
                      </strong>{" "}
                      in {channelLabel(result.message.channel_id)}
                    </span>
                    <time dateTime={result.message.created_at} className="shrink-0">
                      {dateFormat.format(new Date(result.message.created_at))}
                    </time>
                  </div>
                  <p className="mt-1 break-words text-sm">
                    {parseHighlight(result.highlight).map((part, index) =>
                      part.mark ? (
                        <mark key={index} className="rounded-sm bg-primary/20 text-foreground">
                          {showMentions(part.text, names)}
                        </mark>
                      ) : (
                        <span key={index}>{showMentions(part.text, names)}</span>
                      ),
                    )}
                  </p>
                </li>
              )
            })}
          </ul>
        )}

        {nextCursor && (
          <div className="flex justify-center pt-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={status === "loading"}
              onClick={() => {
                const active = activeRef.current
                if (active) void run(active.q, active.params, nextCursor)
              }}
            >
              {status === "loading" ? "Loading…" : "More results"}
            </Button>
          </div>
        )}
        {status === "error" && results.length > 0 && (
          <p role="alert" className="pt-2 text-center text-xs text-destructive">
            Couldn't load more results.
          </p>
        )}
      </div>
    </SidePanel>
  )
}
