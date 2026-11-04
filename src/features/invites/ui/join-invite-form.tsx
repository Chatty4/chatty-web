import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { parseInviteCode } from "../utils/invite-code"

/** Takes a pasted invite link or code to the invite page. */
export function JoinInviteForm() {
  const navigate = useNavigate()
  const [value, setValue] = useState("")
  const [error, setError] = useState<string>()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const code = parseInviteCode(value)
    if (code) navigate(`/invite/${code}`)
    else setError("That doesn't look like an invite link.")
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Input
        aria-label="Invite link or code"
        aria-invalid={error ? true : undefined}
        placeholder="Paste an invite link"
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          setError(undefined)
        }}
      />
      {error && (
        <span role="alert" className="text-[11px] text-destructive">
          {error}
        </span>
      )}
      <Button type="submit" variant="secondary" disabled={!value.trim()}>
        Continue
      </Button>
    </form>
  )
}
