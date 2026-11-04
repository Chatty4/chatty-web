import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router"

import { Alert } from "@/components/ui/alert"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/features/auth"
import { getAllTeamMembersRequest } from "@/features/teams/fetchers/team-fetchers"

import { startDmRequest } from "../fetchers/channel-fetchers"
import { useChannels } from "../hooks/channels-context"
import type { MemberPreview } from "../types"
import { describeChannelError } from "../utils/errors"

type MembersState =
  | { status: "loading" }
  | { status: "loaded"; members: MemberPreview[] }
  | { status: "error"; message: string }

async function fetchTeamMembersForPicker(
  teamId: string,
  myUserId: string,
): Promise<MembersState> {
  try {
    const members = await getAllTeamMembersRequest(teamId)
    const others = members.filter((m) => m.user_id !== myUserId)
    return { status: "loaded", members: others }
  } catch {
    return { status: "error", message: "Could not load team members. Try again." }
  }
}

/** Page for starting a new DM or group DM with team members. */
export function StartDmPage() {
  const { teamId = "" } = useParams()
  const { user } = useAuth()
  const { reload } = useChannels()
  const navigate = useNavigate()

  const myUserId = user?.id ?? ""

  const [membersState, setMembersState] = useState<MembersState>({ status: "loading" })
  const generation = useRef(0)

  const load = useCallback((tid: string, uid: string) => {
    const current = ++generation.current
    void fetchTeamMembersForPicker(tid, uid).then((next) => {
      if (current === generation.current) setMembersState(next)
    })
  }, [])

  useEffect(() => {
    if (teamId) load(teamId, myUserId)
  }, [teamId, myUserId, load])

  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  const visibleMembers =
    membersState.status === "loaded"
      ? membersState.members.filter((m) =>
          query ? m.display_name.toLowerCase().includes(query.toLowerCase()) : true,
        )
      : []

  const toggle = (userId: string) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting || !selected.length) return
    setSubmitting(true)
    setError(undefined)
    try {
      const dm = await startDmRequest(teamId, selected)
      reload()
      navigate(`/teams/${teamId}/channels/${dm.id}`, { replace: true })
    } catch (err) {
      setError(describeChannelError(err))
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">New message</h1>
        <p className="text-sm text-muted-foreground">
          Choose one or more people to start a conversation.
        </p>
      </div>

      {error && <Alert>{error}</Alert>}
      {membersState.status === "error" && <Alert>{membersState.message}</Alert>}

      <Input
        aria-label="Search people"
        placeholder="Search by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {membersState.status === "loading" && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {membersState.status === "loaded" && visibleMembers.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {query ? "No people match your search." : "No other members in this team."}
        </p>
      )}

      {visibleMembers.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
          {visibleMembers.map((member) => {
            const isSelected = selected.includes(member.user_id)
            return (
              <label
                key={member.user_id}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface-hover"
              >
                <input
                  type="checkbox"
                  className="rounded"
                  checked={isSelected}
                  onChange={() => toggle(member.user_id)}
                />
                <Avatar name={member.display_name} />
                <span className="text-sm">{member.display_name}</span>
              </label>
            )
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !selected.length}>
          {submitting ? "Starting…" : "Start conversation"}
        </Button>
      </div>
    </form>
  )
}
