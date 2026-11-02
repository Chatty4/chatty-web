import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router"

import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"

import { createTeamRequest } from "../fetchers/team-fetchers"
import { useTeams } from "../hooks/teams-context"
import { describeTeamError } from "../utils/errors"

export function CreateTeamForm() {
  const [name, setName] = useState("")
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const { reload } = useTeams()
  const navigate = useNavigate()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(undefined)
    try {
      const team = await createTeamRequest(name.trim())
      reload()
      navigate(`/teams/${team.id}`, { replace: true })
    } catch (err) {
      setError(describeTeamError(err))
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {error && <Alert>{error}</Alert>}
      <FormField label="Team name" hint="1–80 characters.">
        {(control) => (
          <Input
            {...control}
            name="name"
            autoFocus
            maxLength={80}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(undefined)
            }}
          />
        )}
      </FormField>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => navigate(-1)} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !name.trim()}>
          {submitting ? "Creating…" : "Create team"}
        </Button>
      </div>
    </form>
  )
}
