import { Copy, Link2, Trash2 } from "lucide-react"
import { type FormEvent, useState } from "react"

import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Select } from "@/components/ui/select"

import { useInvites } from "../hooks/use-invites"
import { describeInviteError } from "../utils/errors"

/** Allowed max_age values per API contract */
const MAX_AGE_OPTIONS = [
  { label: "30 minutes", value: 1800 },
  { label: "1 hour", value: 3600 },
  { label: "6 hours", value: 21600 },
  { label: "12 hours", value: 43200 },
  { label: "1 day", value: 86400 },
  { label: "7 days", value: 604800 },
  { label: "Never", value: 0 },
] as const

/** Allowed max_uses values per API contract */
const MAX_USES_OPTIONS = [
  { label: "Unlimited", value: 0 },
  { label: "1 use", value: 1 },
  { label: "5 uses", value: 5 },
  { label: "10 uses", value: 10 },
  { label: "25 uses", value: 25 },
  { label: "50 uses", value: 50 },
  { label: "100 uses", value: 100 },
] as const

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "Never expires"
  const date = new Date(expiresAt)
  return `Expires ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
}

type CreateInviteDialogProps = {
  onClose: () => void
  onCreate: (maxAge: number, maxUses: number) => Promise<void>
}

function CreateInviteDialog({ onClose, onCreate }: CreateInviteDialogProps) {
  const [maxAge, setMaxAge] = useState(604800)
  const [maxUses, setMaxUses] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(undefined)
    try {
      await onCreate(maxAge, maxUses)
      onClose()
    } catch (err) {
      setError(describeInviteError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-lg">
        <h2 className="mb-1 text-base font-semibold">Create invite link</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Anyone with this link can join the team.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}
          <FormField label="Expires after">
            {(control) => (
              <Select
                {...control}
                value={maxAge}
                onChange={(e) => setMaxAge(Number(e.target.value))}
              >
                {MAX_AGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField label="Maximum uses">
            {(control) => (
              <Select
                {...control}
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
              >
                {MAX_USES_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            )}
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create and copy link"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function InviteSettingsPanel({ teamId }: { teamId: string }) {
  const { state, createInvite, revokeInvite } = useInvites(teamId)
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<string>()
  const [actionError, setActionError] = useState<string>()

  const copyLink = async (code: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/invite/${code}`)
  }

  const handleCreate = async (maxAge: number, maxUses: number) => {
    const invite = await createInvite(maxAge, maxUses)
    await copyLink(invite.code)
  }

  const handleRevoke = async (inviteId: string) => {
    if (!window.confirm("Revoke this invite? The link will stop working immediately.")) return
    setRevoking(inviteId)
    setActionError(undefined)
    try {
      await revokeInvite(inviteId)
    } catch (err) {
      setActionError(describeInviteError(err))
    } finally {
      setRevoking(undefined)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Invite links</p>
          <p className="text-[13px] text-muted-foreground">
            Create links for teammates to join this team.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Link2 className="size-3.5" />
          Create invite
        </Button>
      </div>

      {actionError && <Alert>{actionError}</Alert>}

      {state.status === "loading" && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
      {state.status === "error" && (
        <Alert>{state.message}</Alert>
      )}
      {state.status === "loaded" && state.invites.length === 0 && (
        <div className="rounded-md border border-border px-4 py-6 text-center">
          <p className="text-sm font-medium">No active invite links</p>
          <p className="text-[13px] text-muted-foreground">Create one to invite teammates.</p>
        </div>
      )}
      {state.status === "loaded" && state.invites.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
          {state.invites.map((invite) => (
            <div key={invite.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm">{invite.code}</p>
                <p className="text-[11px] text-muted-foreground">
                  {invite.uses}{invite.max_uses ? ` / ${invite.max_uses}` : ""} uses
                  {" · "}
                  {formatExpiry(invite.expires_at)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Copy invite link"
                onClick={() => void copyLink(invite.code)}
              >
                <Copy className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Revoke invite"
                disabled={revoking === invite.id}
                onClick={() => void handleRevoke(invite.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <CreateInviteDialog
          onClose={() => setCreating(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
