import { type FormEvent, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { X } from "lucide-react"

import { Alert } from "@/components/ui/alert"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { FullScreenMessage } from "@/components/app/full-screen-message"
import { useAuth } from "@/features/auth"
import { useConfirm } from "@/hooks/use-confirm"
import { getTeamMembersRequest } from "@/features/teams/fetchers/team-fetchers"

import { useChannelSettings } from "../hooks/use-channel-settings"
import { useChannels } from "../hooks/channels-context"
import { describeChannelError } from "../utils/errors"
import type { NotifyLevel } from "../types"

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "about" | "members" | "notifications" | "archive"

const TAB_LABELS: Record<Tab, string> = {
  about: "About",
  members: "Members",
  notifications: "Notifications",
  archive: "Archive",
}

// ── About tab ─────────────────────────────────────────────────────────────────

function AboutTab({
  name: initialName,
  topic: initialTopic,
  archived,
  onRename,
}: {
  name: string
  topic: string | null
  archived: boolean
  onRename: (name: string, topic: string | null) => Promise<void>
}) {
  const [name, setName] = useState(initialName)
  const [topic, setTopic] = useState(initialTopic ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError(undefined)
    try {
      await onRename(name.trim(), topic.trim() || null)
    } catch (err) {
      setError(describeChannelError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}
      <form onSubmit={save} className="flex flex-col gap-4">
        <FormField label="Channel name">
          {(control) => (
            <Input
              {...control}
              name="name"
              maxLength={80}
              required
              value={name}
              disabled={archived}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Topic" hint="Optional">
          {(control) => (
            <Input
              {...control}
              name="topic"
              maxLength={250}
              value={topic}
              disabled={archived}
              onChange={(e) => setTopic(e.target.value)}
            />
          )}
        </FormField>
        {!archived && (
          <div>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}

// ── Add members modal ─────────────────────────────────────────────────────────

function AddMembersModal({
  teamId,
  channelName,
  existingMemberIds,
  onAdd,
  onClose,
}: {
  teamId: string
  channelName: string
  existingMemberIds: string[]
  onAdd: (userIds: string[]) => Promise<void>
  onClose: () => void
}) {
  const [candidates, setCandidates] = useState<Array<{ user_id: string; display_name: string }>>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let cancelled = false
    void getTeamMembersRequest(teamId).then(({ members }) => {
      if (!cancelled) {
        setCandidates(members)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [teamId])

  const nonMembers = candidates.filter((m) => !existingMemberIds.includes(m.user_id))

  const toggle = (userId: string, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, userId] : prev.filter((id) => id !== userId)))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selected.length) return
    setSaving(true)
    setError(undefined)
    try {
      await onAdd(selected)
      onClose()
    } catch {
      setError("Could not add members. Please try again.")
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-lg">
        <h2 className="mb-1 text-base font-semibold">Add members</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Choose people to add to #{channelName}.
        </p>
        {error && <Alert className="mb-3">{error}</Alert>}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : nonMembers.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">Everyone is already in this channel.</p>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={onClose}>Close</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="flex max-h-60 flex-col divide-y divide-border overflow-y-auto rounded-md border border-border">
              {nonMembers.map((m) => (
                <label
                  key={m.user_id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface-hover"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(m.user_id)}
                    onChange={(e) => toggle(m.user_id, e.target.checked)}
                  />
                  <Avatar name={m.display_name} />
                  <span className="text-sm">{m.display_name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !selected.length}>
                {saving ? "Adding…" : "Add members"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Members tab ───────────────────────────────────────────────────────────────

function MembersTab({
  teamId,
  channelName,
  members,
  memberNames,
  archived,
  canManage,
  onAdd,
  onRemove,
}: {
  teamId: string
  channelName: string
  members: Array<{ user_id: string; role: "owner" | "member" }>
  memberNames: Record<string, string>
  archived: boolean
  canManage: boolean
  onAdd: (userIds: string[]) => Promise<void>
  onRemove: (userId: string) => Promise<void>
}) {
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()
  const [addingMembers, setAddingMembers] = useState(false)
  const { confirm, confirmProps } = useConfirm()

  const handleRemove = async (userId: string) => {
    const name = memberNames[userId] ?? userId
    const ok = await confirm({
      title: `Remove ${name}?`,
      description: "They will lose access to this channel.",
      action: "Remove",
      destructive: true,
    })
    if (!ok) return
    setBusy(userId)
    setError(undefined)
    try {
      await onRemove(userId)
    } catch (err) {
      setError(describeChannelError(err))
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ConfirmDialog {...confirmProps} />
      {error && <Alert>{error}</Alert>}
      {canManage && !archived && (
        <div>
          <Button size="sm" onClick={() => setAddingMembers(true)}>
            Add members
          </Button>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        {members.length} member{members.length !== 1 ? "s" : ""}
      </p>
      <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
        {members.map((m) => {
          const name = memberNames[m.user_id] ?? m.user_id
          return (
            <div key={m.user_id} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar name={name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{m.role}</p>
              </div>
              {m.role !== "owner" && !archived && canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy === m.user_id}
                  onClick={() => void handleRemove(m.user_id)}
                >
                  Remove
                </Button>
              )}
            </div>
          )
        })}
      </div>
      {addingMembers && (
        <AddMembersModal
          teamId={teamId}
          channelName={channelName}
          existingMemberIds={members.map((m) => m.user_id)}
          onAdd={onAdd}
          onClose={() => setAddingMembers(false)}
        />
      )}
    </div>
  )
}

// ── Notifications tab ─────────────────────────────────────────────────────────

function NotificationsTab({
  notifyLevel,
  muted,
  onUpdate,
}: {
  notifyLevel: NotifyLevel
  muted: boolean
  onUpdate: (settings: { notify_level: NotifyLevel; muted: boolean; hidden: boolean }) => Promise<void>
}) {
  const [level, setLevel] = useState<NotifyLevel>(notifyLevel)
  const [isMuted, setIsMuted] = useState(muted)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError(undefined)
    try {
      await onUpdate({ notify_level: level, muted: isMuted, hidden: false })
    } catch (err) {
      setError(describeChannelError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}
      <FormField label="Notification level">
        {(control) => (
          <Select
            {...control}
            value={level}
            onChange={(e) => setLevel(e.target.value as NotifyLevel)}
          >
            <option value="all">All messages</option>
            <option value="mentions">Mentions only</option>
            <option value="none">None</option>
          </Select>
        )}
      </FormField>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isMuted}
          onChange={(e) => setIsMuted(e.target.checked)}
        />
        Mute this channel
      </label>
      <div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </form>
  )
}

// ── Archive tab ───────────────────────────────────────────────────────────────

function ArchiveTab({
  channelName,
  isDefault,
  archived,
  canManage,
  onArchive,
  onLeave,
}: {
  channelName: string
  isDefault: boolean
  archived: boolean
  canManage: boolean
  onArchive: () => Promise<void>
  onLeave: () => Promise<void>
}) {
  const [archiving, setArchiving] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string>()
  const { confirm, confirmProps } = useConfirm()

  const handleArchive = async () => {
    const ok = await confirm({
      title: `Archive #${channelName}?`,
      description: "Members can still read history, but no one can post new messages.",
      action: "Archive channel",
      destructive: true,
    })
    if (!ok) return
    setArchiving(true)
    setError(undefined)
    try {
      await onArchive()
    } catch (err) {
      setError(describeChannelError(err))
      setArchiving(false)
    }
  }

  const handleLeave = async () => {
    const ok = await confirm({
      title: `Leave #${channelName}?`,
      description: "You will lose access to messages in this channel. You can rejoin if it's public.",
      action: "Leave channel",
      destructive: true,
    })
    if (!ok) return
    setLeaving(true)
    setError(undefined)
    try {
      await onLeave()
    } catch (err) {
      setError(describeChannelError(err))
      setLeaving(false)
    }
  }

  if (isDefault) {
    return (
      <p className="text-sm text-muted-foreground">
        You cannot archive or leave the default channel.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ConfirmDialog {...confirmProps} />
      {error && <Alert>{error}</Alert>}
      {canManage && (
        <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive-soft p-4">
          <p className="text-sm font-medium">
            {archived ? "Channel archived" : "Archive channel"}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {archived
              ? "This channel is read-only. Members can still read message history."
              : "Members can still read history, but no one can post new messages."}
          </p>
          {!archived && (
            <div>
              <Button variant="destructive" disabled={archiving} onClick={() => void handleArchive()}>
                {archiving ? "Archiving…" : "Archive channel"}
              </Button>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col gap-2 rounded-md border border-border p-4">
        <p className="text-sm font-medium">Leave channel</p>
        <p className="text-[13px] text-muted-foreground">
          You will lose access to messages in this channel.
        </p>
        <div>
          <Button variant="destructive" size="sm" disabled={leaving} onClick={() => void handleLeave()}>
            {leaving ? "Leaving…" : "Leave channel"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

const PANEL_TAB_TABS: Tab[] = ["about", "members", "notifications", "archive"]

function PanelTabBar({
  tab,
  onSelect,
}: {
  tab: Tab
  onSelect: (t: Tab) => void
}) {
  return (
    <div
      className="flex shrink-0 border-b border-border px-1"
      role="tablist"
      aria-label="Settings sections"
    >
      {PANEL_TAB_TABS.map((t) => (
        <button
          key={t}
          role="tab"
          aria-selected={tab === t}
          onClick={() => onSelect(t)}
          className="relative px-2.5 pb-2.5 pt-2.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground aria-selected:text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary after:opacity-0 aria-selected:after:opacity-100"
        >
          {TAB_LABELS[t]}
        </button>
      ))}
    </div>
  )
}

// ── Channel details panel (side panel) ───────────────────────────────────────

export type ChannelDetailsPanelProps = {
  channelId: string
  teamId: string
  onClose: () => void
}

/** Side panel rendered alongside the channel view. Toggled from the channel header. */
export function ChannelDetailsPanel({ channelId, teamId, onClose }: ChannelDetailsPanelProps) {
  const { user } = useAuth()
  const { reload } = useChannels()
  const {
    state,
    renameChannel,
    archiveChannel,
    leaveChannel,
    updateNotifications,
    addMembers,
    removeMember,
  } = useChannelSettings(channelId)
  const [tab, setTab] = useState<Tab>("about")
  const navigate = useNavigate()

  const panelShell = (children: React.ReactNode, subtitle?: string) => (
    <aside
      className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-border bg-surface"
      aria-label="Channel details"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">Channel details</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close details" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>
      {children}
    </aside>
  )

  if (state.status === "loading") {
    return panelShell(
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>,
    )
  }

  if (state.status === "error") {
    return panelShell(
      <div className="p-4">
        <Alert>{state.message}</Alert>
      </div>,
    )
  }

  const { channel, members, memberNames } = state
  const canManage = channel.my?.role === "owner" || user?.id === channel.created_by

  const handleRename = async (name: string, topic: string | null) => {
    await renameChannel(name, topic)
    reload()
  }

  const handleArchive = async () => {
    await archiveChannel()
    reload()
    onClose()
  }

  const handleLeave = async () => {
    await leaveChannel()
    reload()
    navigate(`/teams/${teamId}`, { replace: true })
  }

  const handleAddMembers = async (userIds: string[]) => {
    await addMembers(userIds, teamId)
  }

  return panelShell(
    <>
      <PanelTabBar tab={tab} onSelect={setTab} />
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "about" && canManage && (
          <AboutTab
            name={channel.name ?? ""}
            topic={channel.topic}
            archived={channel.archived}
            onRename={handleRename}
          />
        )}
        {tab === "about" && !canManage && (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{channel.name}</p>
            {channel.topic && <p className="text-sm text-muted-foreground">{channel.topic}</p>}
            <p className="text-[13px] text-faint-foreground">
              {channel.member_count} member{channel.member_count !== 1 ? "s" : ""}
            </p>
          </div>
        )}
        {tab === "members" && (
          <MembersTab
            teamId={teamId}
            channelName={channel.name ?? ""}
            members={members}
            memberNames={memberNames}
            archived={channel.archived}
            canManage={canManage}
            onAdd={handleAddMembers}
            onRemove={removeMember}
          />
        )}
        {tab === "notifications" && channel.my && (
          <NotificationsTab
            notifyLevel={channel.my.notify_level}
            muted={channel.my.muted}
            onUpdate={updateNotifications}
          />
        )}
        {tab === "archive" && channel.kind !== "dm" && (
          <ArchiveTab
            channelName={channel.name ?? ""}
            isDefault={channel.is_default}
            archived={channel.archived}
            canManage={canManage}
            onArchive={handleArchive}
            onLeave={handleLeave}
          />
        )}
      </div>
    </>,
    `#${channel.name}`,
  )
}

// ── Channel settings page (settings route) ────────────────────────────────────

/** Full-page settings view for a channel — routed from /channels/:channelId/settings. */
export function ChannelSettings({ channelId }: { channelId: string }) {
  const { user } = useAuth()
  const { reload } = useChannels()
  const {
    state,
    renameChannel,
    archiveChannel,
    leaveChannel,
    updateNotifications,
    addMembers,
    removeMember,
  } = useChannelSettings(channelId)
  const [tab, setTab] = useState<Tab>("about")
  const navigate = useNavigate()
  const { teamId = "" } = useParams()

  if (state.status === "loading") return <FullScreenMessage title="Loading…" />
  if (state.status === "error") {
    return <FullScreenMessage title="Something went wrong" description={state.message} />
  }

  const { channel, members, memberNames } = state
  const canManage = channel.my?.role === "owner" || user?.id === channel.created_by

  const handleRename = async (name: string, topic: string | null) => {
    await renameChannel(name, topic)
    reload()
  }

  const handleArchive = async () => {
    await archiveChannel()
    reload()
  }

  const handleLeave = async () => {
    await leaveChannel()
    reload()
    navigate(`/teams/${teamId}`, { replace: true })
  }

  const handleAddMembers = async (userIds: string[]) => {
    await addMembers(userIds, channel.team_id)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">#{channel.name ?? "Direct message"}</h1>
        <p className="text-sm text-muted-foreground">Channel settings</p>
      </div>

      <div className="flex gap-1 border-b border-border" role="tablist" aria-label="Settings sections">
        {PANEL_TAB_TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="relative px-3 pb-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground aria-selected:text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary after:opacity-0 aria-selected:after:opacity-100"
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="rounded-md border border-border bg-surface p-[22px]">
        {tab === "about" && canManage && (
          <AboutTab
            name={channel.name ?? ""}
            topic={channel.topic}
            archived={channel.archived}
            onRename={handleRename}
          />
        )}
        {tab === "about" && !canManage && (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{channel.name}</p>
            {channel.topic && <p className="text-sm text-muted-foreground">{channel.topic}</p>}
            <p className="text-[13px] text-faint-foreground">
              {channel.member_count} member{channel.member_count !== 1 ? "s" : ""}
            </p>
          </div>
        )}
        {tab === "members" && (
          <MembersTab
            teamId={channel.team_id}
            channelName={channel.name ?? ""}
            members={members}
            memberNames={memberNames}
            archived={channel.archived}
            canManage={canManage}
            onAdd={handleAddMembers}
            onRemove={removeMember}
          />
        )}
        {tab === "notifications" && channel.my && (
          <NotificationsTab
            notifyLevel={channel.my.notify_level}
            muted={channel.my.muted}
            onUpdate={updateNotifications}
          />
        )}
        {tab === "archive" && channel.kind !== "dm" && (
          <ArchiveTab
            channelName={channel.name ?? ""}
            isDefault={channel.is_default}
            archived={channel.archived}
            canManage={canManage}
            onArchive={handleArchive}
            onLeave={handleLeave}
          />
        )}
      </div>
    </div>
  )
}
