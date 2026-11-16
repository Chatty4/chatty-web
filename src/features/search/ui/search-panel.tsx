import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { Loader2, Search } from "lucide-react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidePanel } from "@/components/ui/side-panel"
import { useChannels } from "@/features/channels"
import { useMessages } from "@/features/messages"
import { useMemberNames } from "@/features/messages/hooks/use-member-names"
import { extractMentionIds } from "@/features/messages/utils/mentions"
import { toast } from "@/lib/toast"

import { searchMessages } from "../fetchers/search-fetchers"
import type { SearchResult } from "../types"
import { parseHighlight, showMentions } from "../utils/highlight"

const MIN_LENGTH = 2
const MAX_LENGTH = 200

const dateFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

type Status = "idle" | "loading" | "loaded" | "error"

export type SearchPanelProps = {
  teamId: string
  /** The open channel; a result in another one opens that channel. */
  channelId: string
  onClose: () => void
}

/** Full-text search in the team's messages. Click a result to jump to it. */
export function SearchPanel({ teamId, channelId, onClose }: SearchPanelProps) {
  const navigate = useNavigate()
  const { jumpTo } = useMessages()
  const { channels, dms } = useChannels()

  const [input, setInput] = useState("")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [inputError, setInputError] = useState<string | null>(null)
  // Only the newest request may write: an older answer arriving late is ignored.
  const requestRef = useRef<AbortController | null>(null)

  const run = async (q: string, cursor?: string) => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setStatus("loading")
    try {
      const page = await searchMessages(teamId, q, cursor, controller.signal)
      setResults((previous) => (cursor ? [...previous, ...page.results] : page.results))
      setNextCursor(page.next_cursor)
      setStatus("loaded")
    } catch {
      if (controller.signal.aborted) return
      setStatus("error")
      if (!cursor) setResults([])
    }
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
    setNextCursor(null)
    void run(q)
  }

  const userIds = useMemo(
    () => [
      ...new Set(
        results.flatMap((r) => [r.message.author_id, ...extractMentionIds(r.message.body)]),
      ),
    ],
    [results],
  )
  const names = useMemberNames(teamId, userIds)

  const channelLabel = (id: string) => {
    const channel = [...channels, ...dms].find((c) => c.id === id)
    if (!channel) return "#channel"
    return channel.kind === "dm" ? "Direct message" : `#${channel.name ?? ""}`
  }

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

  return (
    <SidePanel title="Search" subtitle="Messages in this team" closeLabel="Close search" onClose={onClose}>
      <form onSubmit={submit} className="flex shrink-0 gap-2 border-b p-[18px]" role="search">
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
        <span id="search-error" role="alert" className="px-[18px] pt-2 text-xs text-destructive">
          {inputError}
        </span>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-[18px]">
        {status === "loading" && results.length === 0 && (
          <span role="status" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Searching…
          </span>
        )}

        {status === "error" && results.length === 0 && (
          <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 text-center">
            <strong className="font-semibold">Couldn't search.</strong>
            <Button variant="secondary" size="sm" onClick={() => void run(query)}>
              Try again
            </Button>
          </div>
        )}

        {status === "loaded" && results.length === 0 && (
          <div className="flex min-h-[150px] flex-col items-center justify-center gap-1 text-center text-muted-foreground">
            <strong className="text-foreground">No results</strong>
            <span>Try other words.</span>
          </div>
        )}

        {results.length > 0 && (
          <ul className="flex flex-col gap-[9px]" aria-label={`Results for ${query}`}>
            {results.map((result) => (
              <li
                key={result.message.id}
                tabIndex={0}
                role="button"
                onClick={() => void open(result)}
                onKeyDown={(event) => handleKeyDown(event, result)}
                className="cursor-pointer rounded-md border p-3 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-ring"
              >
                <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">
                    <strong className="font-semibold text-foreground">
                      {names[result.message.author_id] ?? "Unknown member"}
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
            ))}
          </ul>
        )}

        {nextCursor && (
          <div className="flex justify-center pt-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={status === "loading"}
              onClick={() => void run(query, nextCursor)}
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
