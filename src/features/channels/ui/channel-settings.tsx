import { type FormEvent, useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { X } from "lucide-react"

import { Alert } from "@/components/ui/alert"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Dialog } from "@/components/ui/dialog"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { DataList, DataRow, RowMain, SectionTitle, SettingsTabs } from "@/components/ui/settings"
import { useAuth } from "@/features/auth"
import { getTeamMembersRequest } from "@/features/teams/fetchers/team-fetchers"
import { useConfirm } from "@/hooks/use-confirm"

import { useChannels } from "../hooks/channels-context"
import { useChannelSettings } from "../hooks/use-channel-settings"
import type { ChannelDetail, ChannelMember, MyChannelSettings, NotifyLevel } from "../types"
import { describeChannelError } from "../utils/errors"

const TABS = ["about", "members", "notifications", "archive"] as const
type Tab = (typeof TABS)[number]

const TAB_LABELS: Record<Tab, string> = {
  about: "About",
  members: "Members",
  notifications: "Notifications",
  archive: "Archive",
}

// ── About ────────────────────────────────────────────────────────────────────

function AboutTab({
  channel,
  canManage,
  onSave,
}: {
  channel: ChannelDetail
  canManage: boolean
  onSave: (name: string, topic: string | null) => Promise<void>
}) {
  const [name, setName] = useState(channel.name ?? "")
  const [topic, setTopic] = useState(channel.topic ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const readOnly = !canManage || channel.archived

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (saving || readOnly) return
    setSaving(true)
    setError(undefined)
    try {
      await onSave(name.trim(), topic.trim() || null)
    } catch (err) {
      setError(describeChannelError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-[18px]">
      {error && <Alert>{error}</Alert>}
      <FormField label="Name">
        {(control) => (
          <Input
            {...control}
            required
            maxLength={80}
            value={name}
            disabled={readOnly}
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </FormField>
      <FormField label="Topic">
        {(control) => (
          <Input
            {...control}
            maxLength={250}
            value={topic}
            disabled={readOnly}
            onChange={(e) => setTopic(e.target.value)}
          />
        )}
      </FormField>
      {!readOnly && (
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      )}
    </form>
  )
}

// ── Add members dialog ───────────────────────────────────────────────────────

type Candidate = { user_id: string; display_name: string }

function AddMembersForm({
  teamId,
  existingMemberIds,
  onAdd,
  onCancel,
}: {
  teamId: string
  existingMemberIds: string[]
  onAdd: (userIds: string[]) => Promise<void>
  onCancel: () => void
}) {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let cancelled = false
    getTeamMembersRequest(teamId)
      .then(({ members }) => {
        if (!cancelled) setCandidates(members.filter((m) => m.is_active))
      })
      .catch(() => {
        if (!cancelled) {
          setCandidates([])
          setError("Could not load team members.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [teamId])

  const available = (candidates ?? []).filter((m) => !existingMemberIds.includes(m.user_id))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected.length) {
      setError("Choose at least one person.")
      return
    }
    setSaving(true)
    setError(undefined)
    try {
      await onAdd(selected)
    } catch (err) {
      setError(describeChannelError(err))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1">
        {candidates === null && (
          <p className="py-6 text-center text-muted-foreground">Loading…</p>
        )}
        {candidates !== null && available.length === 0 && !error && (
          <div className="flex min-h-[150px] items-center justify-center">
            <strong>Everyone is already here</strong>
          </div>
        )}
        {available.map((m) => (
          <label
            key={m.user_id}
            className="flex min-h-[46px] cursor-pointer items-center gap-[9px] rounded-sm px-2 py-1.5 hover:bg-surface-hover"
          >
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={selected.includes(m.user_id)}
              onChange={(e) =>
                setSelected((current) =>
                  e.target.checked
                    ? [...current, m.user_id]
                    : current.filter((id) => id !== m.user_id),
                )
              }
            />
            <Avatar name={m.display_name} />
            <span>{m.display_name}</span>
          </label>
        ))}
      </div>
      {error && <span className="text-[11px] text-destructive">{error}</span>}
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || available.length === 0}>
          {saving ? "Adding…" : "Add members"}
        </Button>
      </div>
    </form>
  )
}

// ── Members ──────────────────────────────────────────────────────────────────

function MembersTab({
  channel,
  teamId,
  members,
  memberNames,
  canManage,
  onAdd,
  onRemove,
}: {
  channel: ChannelDetail
  teamId: string
  members: ChannelMember[]
  memberNames: Record<string, string>
  canManage: boolean
  onAdd: (userIds: string[]) => Promise<void>
  onRemove: (userId: string) => Promise<void>
}) {
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()
  const { confirm, confirmProps } = useConfirm()
  const editable = canManage && !channel.archived

  const handleRemove = async (userId: string) => {
    const name = memberNames[userId] ?? "this member"
    const ok = await confirm({
      title: `Remove ${name}?`,
      description: `They will lose access to #${channel.name}.`,
      action: "Remove member",
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
    <div className="flex flex-col gap-2">
      <ConfirmDialog {...confirmProps} />
      {editable && (
        <div className="flex items-center justify-end gap-2">
          <Button onClick={() => setAdding(true)}>Add members</Button>
        </div>
      )}
      {error && <Alert>{error}</Alert>}
      <DataList>
        {members.map((m) => {
          const name = memberNames[m.user_id] ?? "Unknown member"
          return (
            <DataRow key={m.user_id}>
              <Avatar name={name} />
              <RowMain title={name} detail={m.role === "owner" ? "Channel owner" : "Member"} />
              {editable && m.role !== "owner" && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy === m.user_id}
                  onClick={() => void handleRemove(m.user_id)}
                >
                  Remove
                </Button>
              )}
            </DataRow>
          )
        })}
      </DataList>
      <Dialog
        open={adding}
        title="Add members"
        description={`Choose people to add to #${channel.name}.`}
        onClose={() => setAdding(false)}
      >
        <AddMembersForm
          teamId={teamId}
          existingMemberIds={members.map((m) => m.user_id)}
          onAdd={async (userIds) => {
            await onAdd(userIds)
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      </Dialog>
    </div>
  )
}

// ── Notifications ────────────────────────────────────────────────────────────

function NotificationsTab({
  my,
  onUpdate,
}: {
  my: MyChannelSettings
  onUpdate: (settings: { notify_level: NotifyLevel; muted: boolean; hidden: boolean }) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  const update = async (patch: Partial<{ notify_level: NotifyLevel; muted: boolean }>) => {
    setSaving(true)
    setError(undefined)
    try {
      await onUpdate({ notify_level: my.notify_level, muted: my.muted, hidden: my.hidden, ...patch })
    } catch (err) {
      setError(describeChannelError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {error && <Alert>{error}</Alert>}
      <FormField label="Notification level">
        {(control) => (
          <Select
            {...control}
            value={my.notify_level}
            disabled={saving}
            onChange={(e) => void update({ notify_level: e.target.value as NotifyLevel })}
          >
            <option value="all">All messages</option>
            <option value="mentions">Mentions only</option>
            <option value="none">Nothing</option>
          </Select>
        )}
      </FormField>
      <Button variant="secondary" disabled={saving} onClick={() => void update({ muted: !my.muted })}>
        {my.muted ? "Unmute channel" : "Mute channel"}
      </Button>
    </div>
  )
}

// ── Archive ──────────────────────────────────────────────────────────────────

function ArchiveTab({
  channel,
  canManage,
  onArchive,
  onLeave,
}: {
  channel: ChannelDetail
  canManage: boolean
  onArchive: () => Promise<void>
  onLeave: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const { confirm, confirmProps } = useConfirm()

  const run = async (
    options: { title: string; description: string; action: string },
    action: () => Promise<void>,
  ) => {
    const ok = await confirm({ ...options, destructive: true })
    if (!ok) return
    setBusy(true)
    setError(undefined)
    try {
      await action()
    } catch (err) {
      setError(describeChannelError(err))
    } finally {
      setBusy(false)
    }
  }

  if (channel.is_default) {
    return (
      <SectionTitle
        title="Default channel"
        description="The default channel can't be archived or left."
      />
    )
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <ConfirmDialog {...confirmProps} />
      {error && <Alert>{error}</Alert>}
      <div>
        <SectionTitle
          title={channel.archived ? "Archived" : "Archive channel"}
          description={
            channel.archived
              ? "This channel is read-only."
              : "Members can still read message history."
          }
        />
        {!channel.archived && canManage && (
          <Button
            variant="destructive"
            className="w-full"
            disabled={busy}
            onClick={() =>
              void run(
                {
                  title: `Archive #${channel.name}?`,
                  description: "The channel will become read-only for every member.",
                  action: "Archive channel",
                },
                onArchive,
              )
            }
          >
            Archive channel
          </Button>
        )}
      </div>
      <div className="border-t pt-[18px]">
        <SectionTitle title="Leave channel" description="You can rejoin later if the channel is public." />
        <Button
          variant="secondary"
          className="w-full"
          disabled={busy}
          onClick={() =>
            void run(
              {
                title: `Leave #${channel.name}?`,
                description: "You will stop receiving messages from this channel.",
                action: "Leave channel",
              },
              onLeave,
            )
          }
        >
          Leave channel
        </Button>
      </div>
    </div>
  )
}

// ── Panel ────────────────────────────────────────────────────────────────────

export type ChannelDetailsTab = Tab

export type ChannelDetailsPanelProps = {
  channelId: string
  teamId: string
  /** Tab shown when the panel opens; defaults to About. */
  initialTab?: ChannelDetailsTab
  onClose: () => void
}

/** Right-hand details panel on the channel view: about, members, notifications, archive. */
export function ChannelDetailsPanel({
  channelId,
  teamId,
  initialTab = "about",
  onClose,
}: ChannelDetailsPanelProps) {
  const { user } = useAuth()
  const { reload } = useChannels()
  const navigate = useNavigate()
  const settings = useChannelSettings(channelId)
  const { state } = settings
  const [tab, setTab] = useState<Tab>(initialTab)

  const channel = state.status === "loaded" ? state.channel : null
  const canManage = !!channel && (channel.my?.role === "owner" || user?.id === channel.created_by)
  const tabs = channel?.kind === "dm" ? TABS.filter((t) => t !== "archive") : TABS

  return (
    <aside
      aria-label="Channel details"
      className="flex w-[360px] shrink-0 flex-col border-l bg-surface max-md:fixed max-md:top-16 max-md:right-0 max-md:bottom-0 max-md:z-30 max-md:w-[min(380px,92vw)] max-md:shadow-2xl"
    >
      <div className="flex min-h-[66px] shrink-0 items-center justify-between border-b py-2.5 pr-3 pl-[18px]">
        <div className="flex min-w-0 flex-col">
          <strong className="font-semibold">Channel details</strong>
          {channel?.name && (
            <span className="truncate text-xs text-muted-foreground">#{channel.name}</span>
          )}
        </div>
        <Button variant="ghost" size="icon" aria-label="Close details" onClick={onClose}>
          <X className="size-[17px]" />
        </Button>
      </div>

      {state.status === "loading" && (
        <p className="p-[18px] text-muted-foreground">Loading…</p>
      )}
      {state.status === "error" && (
        <div className="p-[18px]">
          <Alert>{state.message}</Alert>
        </div>
      )}

      {state.status === "loaded" && channel && (
        <>
          <SettingsTabs
            compact
            className="px-2.5"
            tabs={tabs}
            labels={TAB_LABELS}
            value={tab}
            onChange={setTab}
          />
          <div className="min-h-0 flex-1 overflow-y-auto p-[18px]">
            {tab === "about" && (
              <AboutTab
                key={`${channel.name}|${channel.topic}`}
                channel={channel}
                canManage={canManage}
                onSave={async (name, topic) => {
                  await settings.renameChannel(name, topic)
                  reload()
                }}
              />
            )}
            {tab === "members" && (
              <MembersTab
                channel={channel}
                teamId={teamId}
                members={state.members}
                memberNames={state.memberNames}
                canManage={canManage}
                onAdd={(userIds) => settings.addMembers(userIds, teamId)}
                onRemove={settings.removeMember}
              />
            )}
            {tab === "notifications" && channel.my && (
              <NotificationsTab my={channel.my} onUpdate={settings.updateNotifications} />
            )}
            {tab === "archive" && (
              <ArchiveTab
                channel={channel}
                canManage={canManage}
                onArchive={async () => {
                  await settings.archiveChannel()
                  reload()
                }}
                onLeave={async () => {
                  await settings.leaveChannel()
                  reload()
                  navigate(`/teams/${teamId}`, { replace: true })
                }}
              />
            )}
          </div>
        </>
      )}
    </aside>
  )
}
