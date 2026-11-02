import { useCallback, useEffect, useRef, useState } from "react"
import { Hash, Search } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"

import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { buttonVariants } from "@/components/ui/button"

import { browseChannelsRequest, joinChannelRequest } from "../fetchers/channel-fetchers"
import { useChannels } from "../hooks/channels-context"
import type { BrowsableChannel } from "../types"
import { describeChannelError } from "../utils/errors"

type BrowseState =
  | { status: "loading" }
  | { status: "loaded"; channels: BrowsableChannel[]; next_cursor: string | null }
  | { status: "error"; message: string }

/** Page for discovering and joining public channels the user hasn't joined yet. */
export function BrowseChannelsPage() {
  const { teamId = "" } = useParams()
  const { reload } = useChannels()
  const navigate = useNavigate()

  const [query, setQuery] = useState("")
  const [state, setState] = useState<BrowseState>({ status: "loading" })
  const [joiningId, setJoiningId] = useState<string>()
  const generation = useRef(0)

  const load = useCallback(
    (q: string) => {
      const current = ++generation.current
      void browseChannelsRequest(teamId, q || undefined).then((res) => {
        if (current === generation.current) {
          setState({ status: "loaded", channels: res.channels, next_cursor: res.next_cursor })
        }
      }).catch((err: unknown) => {
        if (current === generation.current) {
          setState({ status: "error", message: describeChannelError(err) })
        }
      })
    },
    [teamId],
  )

  useEffect(() => {
    load(query)
  }, [load, query])

  const join = async (channel: BrowsableChannel) => {
    setJoiningId(channel.id)
    try {
      await joinChannelRequest(channel.id)
      reload()
      navigate(`/teams/${teamId}/channels/${channel.id}`)
    } catch {
      setJoiningId(undefined)
    }
  }

  const channels = state.status === "loaded" ? state.channels : []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Browse channels</h1>
        <p className="text-sm text-muted-foreground">
          Find public channels in this team that you haven't joined.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search channels"
            placeholder="Search by name…"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Link
          to={`/teams/${teamId}/channels/new`}
          className={buttonVariants({ variant: "outline" })}
        >
          Create channel
        </Link>
      </div>

      {state.status === "error" && <Alert>{state.message}</Alert>}

      {state.status === "loading" && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {state.status === "loaded" && channels.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {query ? "No channels match your search." : "No public channels to join — you're in all of them."}
        </p>
      )}

      {channels.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
          {channels.map((ch) => (
            <div key={ch.id} className="flex items-center gap-3 px-4 py-3">
              <Hash className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{ch.name}</p>
                {ch.topic && (
                  <p className="truncate text-[13px] text-muted-foreground">{ch.topic}</p>
                )}
                <p className="text-[11px] text-faint-foreground">
                  {ch.member_count} member{ch.member_count !== 1 ? "s" : ""}
                  {ch.archived && " · archived"}
                </p>
              </div>
              <Button
                size="sm"
                disabled={joiningId === ch.id || ch.archived}
                onClick={() => void join(ch)}
              >
                {joiningId === ch.id ? "Joining…" : "Join"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
