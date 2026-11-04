import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router"

import { Alert } from "@/components/ui/alert"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import {
  DataList,
  DataRow,
  RowMain,
  SectionTitle,
  SettingsPanel,
  SettingsTabs,
} from "@/components/ui/settings"
import { FullScreenMessage } from "@/components/app/full-screen-message"
import { useAuth } from "@/features/auth"
import { InviteSettingsPanel } from "@/features/invites/ui/invite-settings-panel"
import { useConfirm } from "@/hooks/use-confirm"

import { useTeamSettings } from "../hooks/use-team-settings"
import { describeTeamError } from "../utils/errors"
import type { Role, TeamMember } from "../types"

const TABS = ["general", "members", "invites", "danger"] as const
type Tab = (typeof TABS)[number]

const TAB_LABELS: Record<Tab, string> = {
  general: "General",
  members: "Members",
  invites: "Invites",
  danger: "Danger zone",
}

function formatJoined(iso: string): string {
  return `Joined ${new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`
}

// ── General ──────────────────────────────────────────────────────────────────

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

  const trimmed = name.trim()
  const unchanged = trimmed === initialName

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (saving || unchanged) return
    if (trimmed.length < 2) {
      setError("Team name must be at least 2 characters.")
      return
    }
    setSaving(true)
    setError(undefined)
    try {
      await onRename(trimmed, iconFileId)
    } catch (err) {
      setError(describeTeamError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsPanel>
      <form onSubmit={save} className="flex flex-col gap-[18px]">
        <FormField label="Team name" error={error}>
          {(control) => (
            <div className="flex gap-2">
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
              <Button type="submit" disabled={saving || unchanged || !trimmed}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </FormField>
      </form>
    </SettingsPanel>
  )
}

// ── Members ──────────────────────────────────────────────────────────────────

function MembersTab({
  myUserId,
  myRole,
  members,
  onChangeRole,
  onRemove,
}: {
  myUserId: string
  myRole: Role
  members: TeamMember[]
  onChangeRole: (userId: string, role: Role) => Promise<void>
  onRemove: (userId: string) => Promise<void>
}) {
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()
  const { confirm, confirmProps } = useConfirm()

  const canManage = myRole === "owner" || myRole === "admin"

  const run = async (userId: string, action: () => Promise<void>) => {
    setBusy(userId)
    setError(undefined)
    try {
      await action()
    } catch (err) {
      setError(describeTeamError(err))
    } finally {
      setBusy(undefined)
    }
  }

  const handleRemove = async (member: TeamMember) => {
    const ok = await confirm({
      title: `Remove ${member.display_name}?`,
      description: "They will lose access to this team and its channels.",
      action: "Remove member",
      destructive: true,
    })
    if (ok) await run(member.user_id, () => onRemove(member.user_id))
  }

  return (
    <SettingsPanel>
      <ConfirmDialog {...confirmProps} />
      <SectionTitle
        title="Members"
        description={`${members.length} ${members.length === 1 ? "person" : "people"}`}
      />
      {error && <Alert className="mb-3">{error}</Alert>}
      <DataList>
        {members.map((member) => {
          const isSelf = member.user_id === myUserId
          const isOwner = member.role === "owner"
          const canEdit = canManage && !isSelf && !(myRole === "admin" && isOwner)
          const isBusy = busy === member.user_id

          return (
            <DataRow key={member.user_id}>
              <Avatar name={member.display_name} />
              <RowMain
                title={
                  <>
                    {member.display_name}
                    {isSelf && <span className="ml-1.5 font-normal text-muted-foreground">(you)</span>}
                  </>
                }
                detail={member.is_active ? formatJoined(member.joined_at) : "Deactivated"}
              />
              <div className="w-[120px] shrink-0">
                <Select
                  aria-label={`Role for ${member.display_name}`}
                  value={member.role}
                  disabled={!canEdit || isBusy}
                  onChange={(e) =>
                    void run(member.user_id, () => onChangeRole(member.user_id, e.target.value as Role))
                  }
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  {/* Only an owner can make someone owner (api-core.md). */}
                  {(myRole === "owner" || isOwner) && <option value="owner">Owner</option>}
                </Select>
              </div>
              {!isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!canEdit || isBusy}
                  onClick={() => void handleRemove(member)}
                >
                  Remove
                </Button>
              )}
            </DataRow>
          )
        })}
      </DataList>
    </SettingsPanel>
  )
}

// ── Danger zone ──────────────────────────────────────────────────────────────

function DangerTab({
  myRole,
  onLeave,
  onDelete,
}: {
  myRole: Role
  onLeave: () => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const navigate = useNavigate()
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
      navigate("/", { replace: true })
    } catch (err) {
      setError(describeTeamError(err))
      setBusy(false)
    }
  }

  return (
    <SettingsPanel className="border-border-strong">
      <ConfirmDialog {...confirmProps} />
      <SectionTitle title="Team actions" description="These changes affect your access." />
      {error && <Alert className="mb-3">{error}</Alert>}
      <div className="flex items-center justify-end gap-2">
        {myRole !== "owner" && (
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() =>
              void run(
                {
                  title: "Leave this team?",
                  description: "You will lose access until someone invites you again.",
                  action: "Leave team",
                },
                onLeave,
              )
            }
          >
            Leave team
          </Button>
        )}
        {myRole === "owner" && (
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() =>
              void run(
                {
                  title: "Delete this team?",
                  description: "All channels and team data will be permanently removed.",
                  action: "Delete team",
                },
                onDelete,
              )
            }
          >
            Delete team
          </Button>
        )}
      </div>
    </SettingsPanel>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function TeamSettings({ teamId }: { teamId: string }) {
  const { user } = useAuth()
  const { state, renameTeam, deleteTeam, leaveTeam, changeRole, removeMember } =
    useTeamSettings(teamId)
  const [tab, setTab] = useState<Tab>("general")

  if (state.status === "loading") return <FullScreenMessage title="Loading…" />
  if (state.status === "error") {
    return <FullScreenMessage title="Something went wrong" description={state.message} />
  }

  const { team, members } = state

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1">
        <strong className="text-xl font-semibold tracking-[-0.02em]">Team settings</strong>
        <span className="text-muted-foreground">Manage {team.name} and its members.</span>
      </div>

      <SettingsTabs tabs={TABS} labels={TAB_LABELS} value={tab} onChange={setTab} />

      {tab === "general" && (
        <GeneralTab
          key={team.name}
          name={team.name}
          iconFileId={team.icon_file_id}
          onRename={renameTeam}
        />
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
      {tab === "invites" && (
        <SettingsPanel>
          <InviteSettingsPanel teamId={teamId} />
        </SettingsPanel>
      )}
      {tab === "danger" && (
        <DangerTab myRole={team.my_role} onLeave={leaveTeam} onDelete={deleteTeam} />
      )}
    </div>
  )
}
