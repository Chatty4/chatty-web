import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router"

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

import { InviteSettingsPanel } from "@/features/invites/ui/invite-settings-panel"

import { useTeamSettings } from "../hooks/use-team-settings"
import { describeTeamError } from "../utils/errors"
import type { Role } from "../types"

type Tab = "general" | "members" | "invites" | "danger"

// ── General tab ──────────────────────────────────────────────────────────────

function GeneralTab({
  name: initialName,
  iconFileId,
  onRename,
}: {
  name: string
  iconFileId: string | null
  onRename: (name: string, iconFileId: string | null) => Promise<void>
}) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (saving || !name.trim() || name.trim() === initialName) return
    setSaving(true)
    setError(undefined)
    try {
      await onRename(name.trim(), iconFileId)
    } catch (err) {
      setError(describeTeamError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="flex max-w-sm flex-col gap-4">
      {error && <Alert>{error}</Alert>}
      <FormField label="Team name">
        {(control) => (
          <Input
            {...control}
            name="name"
            maxLength={80}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(undefined)
            }}
          />
        )}
      </FormField>
      <div>
        <Button type="submit" disabled={saving || !name.trim() || name.trim() === initialName}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  )
}

// ── Members tab ───────────────────────────────────────────────────────────────

function MembersTab({
  myUserId,
  myRole,
  members,
  onChangeRole,
  onRemove,
}: {
  myUserId: string
  myRole: Role
  members: Array<{ user_id: string; display_name: string; role: Role; is_active: boolean }>
  onChangeRole: (userId: string, role: Role) => Promise<void>
  onRemove: (userId: string) => Promise<void>
}) {
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()
  const { confirm, confirmProps } = useConfirm()

  const canManage = myRole === "owner" || myRole === "admin"

  const handleRoleChange = async (userId: string, role: Role) => {
    setBusy(userId)
    setError(undefined)
    try {
      await onChangeRole(userId, role)
    } catch (err) {
      setError(describeTeamError(err))
    } finally {
      setBusy(undefined)
    }
  }

  const handleRemove = async (userId: string, displayName: string) => {
    const ok = await confirm({
      title: `Remove ${displayName}?`,
      description: "They will lose access to all channels in this team.",
      action: "Remove",
      destructive: true,
    })
    if (!ok) return
    setBusy(userId)
    setError(undefined)
    try {
      await onRemove(userId)
    } catch (err) {
      setError(describeTeamError(err))
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ConfirmDialog {...confirmProps} />
      {error && <Alert>{error}</Alert>}
      <p className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</p>
      <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
        {members.map((member) => {
          const isSelf = member.user_id === myUserId
          const isOwner = member.role === "owner"
          const canEdit = canManage && !isSelf && !(myRole === "admin" && isOwner)
          const isBusy = busy === member.user_id

          return (
            <div
              key={member.user_id}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <Avatar name={member.display_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">
                  {member.display_name}
                  {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                </p>
                {!member.is_active && (
                  <p className="text-xs text-muted-foreground">Deactivated</p>
                )}
              </div>
              <Select
                aria-label={`Role for ${member.display_name}`}
                value={member.role}
                disabled={!canEdit || isBusy}
                onChange={(e) => void handleRoleChange(member.user_id, e.target.value as Role)}
              >
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </Select>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => void handleRemove(member.user_id, member.display_name)}
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

// ── Danger tab ────────────────────────────────────────────────────────────────

function DangerTab({
  teamName,
  myRole,
  onLeave,
  onDelete,
}: {
  teamName: string
  myRole: Role
  onLeave: () => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const navigate = useNavigate()
  const { confirm, confirmProps } = useConfirm()

  const handleLeave = async () => {
    const ok = await confirm({
      title: `Leave ${teamName}?`,
      description: "You'll lose access to all channels until someone invites you again.",
      action: "Leave team",
      destructive: true,
    })
    if (!ok) return
    setBusy(true)
    setError(undefined)
    try {
      await onLeave()
      navigate("/", { replace: true })
    } catch (err) {
      setError(describeTeamError(err))
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete ${teamName}?`,
      description: "All channels and team data will be permanently removed. This cannot be undone.",
      action: "Delete team",
      destructive: true,
    })
    if (!ok) return
    setBusy(true)
    setError(undefined)
    try {
      await onDelete()
      navigate("/", { replace: true })
    } catch (err) {
      setError(describeTeamError(err))
      setBusy(false)
    }
  }

  return (
    <div className="flex max-w-sm flex-col gap-4">
      <ConfirmDialog {...confirmProps} />
      {error && <Alert>{error}</Alert>}
      {myRole !== "owner" && (
        <div className="rounded-md border border-destructive/40 bg-destructive-soft p-4">
          <p className="mb-3 text-sm font-medium">Leave team</p>
          <p className="mb-4 text-[13px] text-muted-foreground">
            You will lose access to all channels in this team. You can rejoin with an invite.
          </p>
          <Button variant="destructive" disabled={busy} onClick={() => void handleLeave()}>
            Leave team
          </Button>
        </div>
      )}
      {myRole === "owner" && (
        <div className="rounded-md border border-destructive/40 bg-destructive-soft p-4">
          <p className="mb-3 text-sm font-medium">Delete team</p>
          <p className="mb-4 text-[13px] text-muted-foreground">
            All channels and team data will be permanently removed. This cannot be undone.
          </p>
          <Button variant="destructive" disabled={busy} onClick={() => void handleDelete()}>
            Delete team
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

export function TeamSettings({ teamId }: { teamId: string }) {
  const { user } = useAuth()
  const { state, renameTeam, deleteTeam, leaveTeam, changeRole, removeMember } =
    useTeamSettings(teamId)
  const [tab, setTab] = useState<Tab>("general")

  if (state.status === "loading") {
    return <FullScreenMessage title="Loading…" />
  }
  if (state.status === "error") {
    return <FullScreenMessage title="Something went wrong" description={state.message} />
  }

  const { team, members } = state
  const tabs: Tab[] = ["general", "members", "invites", "danger"]
  const tabLabel: Record<Tab, string> = {
    general: "General",
    members: "Members",
    invites: "Invites",
    danger: "Danger zone",
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">{team.name}</h1>
        <p className="text-sm text-muted-foreground">Team settings</p>
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
        {tab === "general" && (
          <GeneralTab name={team.name} iconFileId={team.icon_file_id} onRename={renameTeam} />
        )}
        {tab === "members" && (
          <MembersTab
            myUserId={user?.id ?? ""}
            myRole={team.my_role}
            members={members}
            onChangeRole={changeRole}
            onRemove={removeMember}
          />
        )}
        {tab === "invites" && <InviteSettingsPanel teamId={teamId} />}
        {tab === "danger" && (
          <DangerTab
            teamName={team.name}
            myRole={team.my_role}
            onLeave={leaveTeam}
            onDelete={deleteTeam}
          />
        )}
      </div>
    </div>
  )
}
