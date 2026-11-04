import { useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"

import { Alert } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SettingsPanel } from "@/components/ui/settings"
import { toast } from "@/lib/toast"

import { joinChannelRequest, leaveChannelRequest } from "../fetchers/channel-fetchers"
import { useBrowseChannels } from "../hooks/use-browse-channels"
import { useChannels } from "../hooks/channels-context"
import { mergeBrowseEntries, type BrowseEntry } from "../utils/browse-entries"
import { describeChannelError } from "../utils/errors"
import { BrowseChannelPreview } from "./browse-channel-preview"
import { BrowseChannelRow } from "./browse-channel-row"

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[150px] flex-col items-center justify-center text-center text-muted-foreground">
      <strong className="font-semibold text-foreground">{title}</strong>
      <span>{description}</span>
    </div>
  )
}

/** Find channels in the team: search on the left, preview and actions on the right. */
export function BrowseChannelsPage() {
  const { teamId = "" } = useParams()
  const { channels: myChannels, reload } = useChannels()
  const navigate = useNavigate()

  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string>()
  const { state, loadMore, refresh } = useBrowseChannels(teamId, query)

  const entries = useMemo(
    () => mergeBrowseEntries(state.status === "loaded" ? state.channels : [], myChannels, query),
    [state, myChannels, query],
  )
  const preview = entries.find((e) => e.id === selectedId) ?? entries[0] ?? null

  const openChannel = (entry: BrowseEntry) => navigate(`/teams/${teamId}/channels/${entry.id}`)

  const join = async (entry: BrowseEntry) => {
    await joinChannelRequest(entry.id)
    reload()
    toast.success(`Joined #${entry.name}`)
    openChannel(entry)
  }

  const leave = async (entry: BrowseEntry) => {
    await leaveChannelRequest(entry.id)
    reload()
    refresh()
    toast.success(`Left #${entry.name}`)
  }

  const showMore = () => {
    loadMore().catch((error: unknown) => toast.error(describeChannelError(error)))
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1">
        <strong className="text-xl font-semibold tracking-[-0.02em]">Browse channels</strong>
        <span className="text-muted-foreground">Find conversations across this team.</span>
      </div>

      <div className="flex gap-2.5">
        <Input
          aria-label="Search channels"
          placeholder="Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Link to={`/teams/${teamId}/channels/new`} className={buttonVariants()}>
          Create channel
        </Link>
      </div>

      {state.status === "error" && <Alert>{state.message}</Alert>}

      <div className="grid min-h-[420px] gap-4 md:grid-cols-[minmax(280px,1fr)_minmax(280px,0.8fr)]">
        <div className="max-h-[560px] overflow-y-auto rounded-md border bg-surface p-2">
          {state.status === "loading" && (
            <p role="status" className="p-2 text-muted-foreground">
              Loading…
            </p>
          )}
          {state.status === "loaded" && entries.length === 0 && (
            <EmptyState title="No channels found" description="Try a different search." />
          )}
          {entries.map((entry) => (
            <BrowseChannelRow
              key={entry.id}
              entry={entry}
              active={entry.id === preview?.id}
              onSelect={() => setSelectedId(entry.id)}
            />
          ))}
          {state.status === "loaded" && state.nextCursor && (
            <div className="pt-2 text-center">
              <Button variant="secondary" size="sm" disabled={state.loadingMore} onClick={showMore}>
                {state.loadingMore ? "Loading…" : "Show more channels"}
              </Button>
            </div>
          )}
        </div>

        <SettingsPanel className="flex flex-col items-start gap-[13px] max-md:min-h-[260px]">
          {preview ? (
            <BrowseChannelPreview
              key={preview.id}
              entry={preview}
              onJoin={join}
              onLeave={leave}
              onOpen={openChannel}
            />
          ) : (
            <div className="w-full">
              <EmptyState title="Select a channel" description="Preview its topic and members here." />
            </div>
          )}
        </SettingsPanel>
      </div>
    </div>
  )
}
