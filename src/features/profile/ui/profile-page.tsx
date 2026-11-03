import { type FormEvent, useState } from "react"

import { Alert } from "@/components/ui/alert"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"

import { useProfile } from "../hooks/use-profile"
import type { ChangePasswordInput } from "../types"

// ── Timezone options ──────────────────────────────────────────────────────────

const TIMEZONES: Array<{ value: string; label: string }> = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "America/Sao_Paulo", label: "Brasília (São Paulo)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Central European Time (Paris)" },
  { value: "Europe/Bucharest", label: "Eastern European Time (Bucharest)" },
  { value: "Europe/Moscow", label: "Moscow" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Kolkata", label: "India (Kolkata)" },
  { value: "Asia/Bangkok", label: "Indochina (Bangkok)" },
  { value: "Asia/Shanghai", label: "China (Shanghai)" },
  { value: "Asia/Tokyo", label: "Japan (Tokyo)" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Pacific/Auckland", label: "New Zealand (Auckland)" },
]

// ── Profile section ───────────────────────────────────────────────────────────

function ProfileSection({
  displayName: initialDisplayName,
  timezone: initialTimezone,
  onSave,
}: {
  displayName: string
  timezone: string
  onSave: (displayName: string, timezone: string) => Promise<void>
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [timezone, setTimezone] = useState(initialTimezone)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [saved, setSaved] = useState(false)

  const isDirty =
    displayName.trim() !== initialDisplayName || timezone !== initialTimezone

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving || !displayName.trim() || !isDirty) return
    setSaving(true)
    setError(undefined)
    setSaved(false)
    try {
      await onSave(displayName.trim(), timezone)
      setSaved(true)
    } catch {
      setError("Could not save profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-[18px] rounded-md border border-border bg-surface p-[22px]">
      <div className="mb-0.5 flex flex-col">
        <strong className="text-sm font-semibold">Profile</strong>
        <span className="text-[13px] text-muted-foreground">Update how teammates see you.</span>
      </div>

      {/* Avatar row */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Avatar name={displayName} className="size-12 text-base" />
        <div className="flex min-w-0 flex-1 flex-col">
          <strong className="text-sm font-medium">Profile photo</strong>
          <span className="text-[12px] text-muted-foreground">Avatar uploads are coming soon.</span>
        </div>
        <Button variant="ghost" size="sm" disabled>
          Upload
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        {error && <Alert>{error}</Alert>}
        {saved && (
          <p className="text-[13px] text-green-600 dark:text-green-400">Profile saved.</p>
        )}
        <FormField label="Display name">
          {(control) => (
            <Input
              {...control}
              name="display_name"
              maxLength={60}
              required
              autoFocus
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value)
                setSaved(false)
                setError(undefined)
              }}
            />
          )}
        </FormField>
        <FormField label="Timezone">
          {(control) => (
            <Select
              {...control}
              value={timezone}
              onChange={(e) => {
                setTimezone(e.target.value)
                setSaved(false)
              }}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving || !displayName.trim() || !isDirty}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </section>
  )
}

// ── Password section ──────────────────────────────────────────────────────────

function PasswordSection({
  onSave,
}: {
  onSave: (input: ChangePasswordInput) => Promise<void>
}) {
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [saved, setSaved] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.")
      return
    }
    setSaving(true)
    setError(undefined)
    setSaved(false)
    try {
      await onSave({ old_password: oldPassword, new_password: newPassword })
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setSaved(true)
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes("wrong_password")
          ? "Current password is incorrect."
          : "Could not change password. Make sure it is at least 10 characters and not a common one."
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-[18px] rounded-md border border-border bg-surface p-[22px]">
      <div className="mb-0.5 flex flex-col">
        <strong className="text-sm font-semibold">Password</strong>
        <span className="text-[13px] text-muted-foreground">
          Change the password used to access your account.
        </span>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        {error && <Alert>{error}</Alert>}
        {saved && (
          <p className="text-[13px] text-green-600 dark:text-green-400">Password changed.</p>
        )}
        <FormField label="Current password">
          {(control) => (
            <Input
              {...control}
              type="password"
              name="old_password"
              required
              autoComplete="current-password"
              value={oldPassword}
              onChange={(e) => {
                setOldPassword(e.target.value)
                setSaved(false)
                setError(undefined)
              }}
            />
          )}
        </FormField>
        <FormField label="New password" hint="At least 10 characters.">
          {(control) => (
            <Input
              {...control}
              type="password"
              name="new_password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                setSaved(false)
                setError(undefined)
              }}
            />
          )}
        </FormField>
        <FormField label="Confirm new password">
          {(control) => (
            <Input
              {...control}
              type="password"
              name="confirm_password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setSaved(false)
                setError(undefined)
              }}
            />
          )}
        </FormField>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving || !oldPassword || !newPassword || !confirmPassword}
          >
            {saving ? "Changing…" : "Change password"}
          </Button>
        </div>
      </form>
    </section>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

/** Account settings: profile (name, timezone) and password change. */
export function ProfilePage() {
  const { user, updateProfile, changePassword } = useProfile()

  if (!user) return null

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1">
        <h1 className="text-[20px] font-semibold tracking-tight">Account settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and security.</p>
      </div>

      <ProfileSection
        displayName={user.display_name}
        timezone={user.timezone}
        onSave={updateProfile}
      />

      <PasswordSection onSave={changePassword} />
    </div>
  )
}
