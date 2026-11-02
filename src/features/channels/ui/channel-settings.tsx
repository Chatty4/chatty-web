import { type FormEvent, useState } from "react"
import { useNavigate, useParams } from "react-router"

import { Alert } from "@/components/ui/alert"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { FullScreenMessage } from "@/components/app/full-screen-message"
import { useAuth } from "@/features/auth"

import { useChannelSettings } from "../hooks/use-channel-settings"
import { useChannels } from "../hooks/channels-context"
import { describeChannelError } from "../utils/errors"
import type { NotifyLevel } from "../types"

type Tab = "general" | "members" | "notifications" | "danger"

// ── General tab ──────────────────────────────────────────────────────────────

function GeneralTab({
  name: initialName,
  topic: initialTopic,
  archived,
  isDefault,
  onRename,
  onArchive,
}: {
  name: string
  topic: string | null
  archived: boolean
  isDefault: boolean
  onRename: (name: string, topic: string | null) => Promise<void>
  onArchive: () => Promise<void>
}) {
  const [name, setName] = useState(initialName)
  const [topic, setTopic] = useState(initialTopic ?? "")
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)
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

  const archive = async () => {
    if (!window.confirm(`Archive #${initialName}? It will become read-only.`)) return
    setArchiving(true)
    setError(undefined)
    try {
      await onArchive()
    } catch (err) {
      setError(describeChannelError(err))
    } finally {
      setArchiving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <Alert>{error}</Alert>}
      <form onSubmit={save} className="flex max-w-sm flex-col gap-4">
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

      {!isDefault && !archived && (
        <div className="flex max-w-sm flex-col gap-3 rounded-md border border-destructive/40 bg-destructive-soft p-4">
          <p className="text-sm font-medium">Archive channel</p>
          <p className="text-[13px] text-muted-foreground">
            Members can still read history, but no one can post new messages.
          </p>
          <div>
            <Button variant="destructive" disabled={archiving} onClick={() => void archive()}>
              {archiving ? "Archiving…" : "Archive channel"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Members tab ───────────────────────────────────────────────────────────────

function MembersTab({
  members,
  memberNames,
  archived,
  onRemove,
}: {
  members: Array<{ user_id: string; role: "owner" | "member" }>
  memberNames: Record<string, string>
  archived: boolean
  onRemove: (userId: string) => Promise<void>
}) {
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()

  const handleRemove = async (userId: string) => {
    const name = memberNames[userId] ?? userId
    if (!window.confirm(`Remove ${name} from this channel?`)) return
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
      {error && <Alert>{error}</Alert>}
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
              {m.role !== "owner" && !archived && (
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
    <form onSubmit={save} className="flex max-w-sm flex-col gap-4">
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

// ── Danger tab ────────────────────────────────────────────────────────────────

function DangerTab({
  channelName,
  isDefault,
  onLeave,
}: {
  channelName: string
  isDefault: boolean
  onLeave: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const navigate = useNavigate()
  const { teamId = "" } = useParams()

  const handleLeave = async () => {
    if (!window.confirm(`Leave #${channelName}? You can rejoin if it's public.`)) return
    setBusy(true)
    setError(undefined)
    try {
      await onLeave()
      navigate(`/teams/${teamId}`, { replace: true })
    } catch (err) {
      setError(describeChannelError(err))
      setBusy(false)
    }
  }

  return (
    <div className="flex max-w-sm flex-col gap-4">
      {error && <Alert>{error}</Alert>}
      {isDefault ? (
        <p className="text-sm text-muted-foreground">
          You cannot leave the default channel.
        </p>
      ) : (
        <div className="rounded-md border border-destructive/40 bg-destructive-soft p-4">
          <p className="mb-3 text-sm font-medium">Leave channel</p>
          <p className="mb-4 text-[13px] text-muted-foreground">
            You will lose access to messages in this channel.
          </p>
          <Button variant="destructive" disabled={busy} onClick={() => void handleLeave()}>
            Leave channel
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

/** Settings panel for a channel: general info, members, notifications, and danger zone. */
export function ChannelSettings({ channelId }: { channelId: string }) {
  const { user } = useAuth()
  const { reload } = useChannels()
  const {
    state,
    renameChannel,
    archiveChannel,
    leaveChannel,
    updateNotifications,
    removeMember,
  } = useChannelSettings(channelId)
  const [tab, setTab] = useState<Tab>("general")

  if (state.status === "loading") return <FullScreenMessage title="Loading…" />
  if (state.status === "error") {
    return <FullScreenMessage title="Something went wrong" description={state.message} />
  }

  const { channel, members, memberNames } = state
  const canManage =
    channel.my?.role === "owner" ||
    user?.id === channel.created_by

  const tabs: Tab[] = ["general", "members", "notifications", "danger"]
  const tabLabel: Record<Tab, string> = {
    general: "General",
    members: "Members",
    notifications: "Notifications",
    danger: "Danger zone",
  }

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
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">#{channel.name ?? "Direct message"}</h1>
        <p className="text-sm text-muted-foreground">Channel settings</p>
      </div>

      <div className="flex gap-1 border-b border-border" role="tablist" aria-label="Settings sections">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="relative px-3 pb-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground aria-selected:text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary after:opacity-0 aria-selected:after:opacity-100"
          >
            {tabLabel[t]}
          </button>
        ))}
      </div>

      <div className="rounded-md border border-border bg-surface p-[22px]">
        {tab === "general" && canManage && (
          <GeneralTab
            name={channel.name ?? ""}
            topic={channel.topic}
            archived={channel.archived}
            isDefault={channel.is_default}
            onRename={handleRename}
            onArchive={handleArchive}
          />
        )}
        {tab === "general" && !canManage && (
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
            members={members}
            memberNames={memberNames}
            archived={channel.archived}
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
        {tab === "danger" && channel.kind !== "dm" && (
          <DangerTab
            channelName={channel.name ?? ""}
            isDefault={channel.is_default}
            onLeave={handleLeave}
          />
        )}
      </div>
    </div>
  )
}
