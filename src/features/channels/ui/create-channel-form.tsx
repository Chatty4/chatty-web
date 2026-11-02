import { type FormEvent, useState } from "react"
import { useNavigate, useParams } from "react-router"

import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useChannels } from "../hooks/channels-context"
import { createChannelRequest } from "../fetchers/channel-fetchers"
import { describeChannelError } from "../utils/errors"

/** Form for creating a new channel (public or private). Navigates to the new channel on success. */
export function CreateChannelForm() {
  const { teamId = "" } = useParams()
  const { reload } = useChannels()
  const navigate = useNavigate()

  const [name, setName] = useState("")
  const [kind, setKind] = useState<"public" | "private">("public")
  const [topic, setTopic] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(undefined)
    try {
      const channel = await createChannelRequest(teamId, name.trim(), kind, topic.trim() || undefined)
      reload()
      navigate(`/teams/${teamId}/channels/${channel.id}`, { replace: true })
    } catch (err) {
      setError(describeChannelError(err))
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-sm flex-col gap-5 rounded-lg border border-border bg-surface p-6"
    >
      {error && <Alert>{error}</Alert>}
      <FormField label="Name" hint="Lowercase letters, numbers, hyphens and underscores only.">
        {(control) => (
          <Input
            {...control}
            name="name"
            placeholder="e.g. announcements"
            autoFocus
            maxLength={80}
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value.toLowerCase().replace(/[^a-z0-9\-_]/g, ""))
              setError(undefined)
            }}
          />
        )}
      </FormField>
      <FormField label="Visibility">
        {(control) => (
          <Select
            {...control}
            value={kind}
            onChange={(e) => setKind(e.target.value as "public" | "private")}
          >
            <option value="public">Public — anyone in the team can join</option>
            <option value="private">Private — invite only</option>
          </Select>
        )}
      </FormField>
      <FormField label="Topic" hint="Optional — shown in the sidebar and channel header.">
        {(control) => (
          <Input
            {...control}
            name="topic"
            placeholder="e.g. Release announcements"
            maxLength={250}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        )}
      </FormField>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" disabled={submitting} onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !name.trim()}>
          {submitting ? "Creating…" : "Create channel"}
        </Button>
      </div>
    </form>
  )
}
