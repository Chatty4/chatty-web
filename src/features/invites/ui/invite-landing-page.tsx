import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"

import { Alert } from "@/components/ui/alert"
import { BrandMark } from "@/components/app/brand-mark"
import { Button, buttonVariants } from "@/components/ui/button"
import { useAuth } from "@/features/auth"
import { ApiError } from "@/lib/api"

import { joinInviteRequest, lookupInviteRequest } from "../fetchers/invite-fetchers"
import { describeInviteError } from "../utils/errors"
import type { InviteLookup } from "../types"

type Props = { code: string }

export function InviteLandingPage({ code }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [lookup, setLookup] = useState<InviteLookup | null>(null)
  // "invalid": no such invite. "failed": we couldn't find out, so the link may be fine.
  const [loadError, setLoadError] = useState<"invalid" | "failed">()
  const [attempt, setAttempt] = useState(0)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string>()

  useEffect(() => {
    let cancelled = false
    lookupInviteRequest(code)
      .then((result) => { if (!cancelled) setLookup(result) })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(error instanceof ApiError && error.status === 404 ? "invalid" : "failed")
      })
    return () => { cancelled = true }
  }, [code, attempt])

  const retryLookup = () => {
    setLoadError(undefined)
    setAttempt((current) => current + 1)
  }

  const handleJoin = async () => {
    setJoining(true)
    setJoinError(undefined)
    try {
      const result = await joinInviteRequest(code)
      void navigate(`/teams/${result.team_id}`, { replace: true })
    } catch (err) {
      setJoinError(describeInviteError(err))
      setJoining(false)
    }
  }

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-[18px] rounded-md border border-border bg-surface p-[18px] shadow-[0_8px_28px_var(--shadow)] sm:p-7">
      <div className="flex items-center gap-2.5 text-base font-semibold">
        <BrandMark />
        Chatty
      </div>

      {loadError === "failed" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-[-0.02em]">Couldn't load this invite</h1>
            <p className="text-muted-foreground">Check your connection and try again.</p>
          </div>
          <Button onClick={retryLookup}>Try again</Button>
        </div>
      )}

      {loadError === "invalid" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-[-0.02em]">Invite unavailable</h1>
            <p className="text-muted-foreground">This invite link is invalid or has expired.</p>
          </div>
          <Link to="/" className={buttonVariants({ variant: "outline" })}>
            Go to Chatty
          </Link>
        </div>
      )}

      {!loadError && !lookup && (
        <p className="text-sm text-muted-foreground">Loading invite…</p>
      )}

      {lookup && !lookup.valid && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-[-0.02em]">Invite unavailable</h1>
            <p className="text-muted-foreground">
              {lookup.reason === "expired" && "This invite link has expired."}
              {lookup.reason === "revoked" && "This invite link has been revoked."}
              {lookup.reason === "used_up" && "This invite link has been used up."}
            </p>
          </div>
          <Link to="/" className={buttonVariants({ variant: "outline" })}>
            Go to Chatty
          </Link>
        </div>
      )}

      {lookup?.valid && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              {lookup.team.name[0]?.toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{lookup.team.name}</p>
              <p className="text-[13px] text-muted-foreground">
                {lookup.team.member_count} member{lookup.team.member_count !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-[-0.02em]">You're invited</h1>
            <p className="text-muted-foreground">
              Join <strong>{lookup.team.name}</strong> on Chatty.
            </p>
          </div>

          {joinError && <Alert>{joinError}</Alert>}

          {user ? (
            <Button disabled={joining} onClick={() => void handleJoin()}>
              {joining ? "Joining…" : "Join team"}
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                to="/register"
                state={{ from: `/invite/${code}` }}
                className={buttonVariants()}
              >
                Create an account to join
              </Link>
              <Link
                to="/login"
                state={{ from: `/invite/${code}` }}
                className={buttonVariants({ variant: "outline" })}
              >
                Log in to join
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
