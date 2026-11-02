import { Navigate, Outlet, useLocation } from "react-router"

import { FullScreenMessage } from "@/components/app/full-screen-message"
import { Button } from "@/components/ui/button"
import { useAuth, type RedirectState } from "@/features/auth"

/** Pages for logged-in users. Others go to the login page, which brings them back after. */
export function RequireAuth() {
  const { status, retry } = useAuth()
  const location = useLocation()

  if (status === "loading") return <FullScreenMessage title="Loading Chatty…" />

  if (status === "unavailable") {
    return (
      <FullScreenMessage
        title="Chatty can't be reached"
        description="Check your connection. Your session is kept, so you won't have to log in again."
      >
        <Button onClick={retry}>Try again</Button>
      </FullScreenMessage>
    )
  }

  if (status === "anonymous") {
    const state: RedirectState = { from: location.pathname + location.search + location.hash }
    return <Navigate to="/login" replace state={state} />
  }

  return <Outlet />
}
