import { Navigate, Outlet, useLocation } from "react-router"

import { FullScreenMessage } from "@/components/app/full-screen-message"
import { safeRedirectPath, useAuth, type RedirectState } from "@/features/auth"

/**
 * Login and register. A logged-in user goes to the app: to the page RequireAuth sent them
 * away from, if any. This is also how the forms leave after a successful login.
 */
export function GuestOnly() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === "loading") return <FullScreenMessage title="Loading Chatty…" />
  if (status === "authenticated") {
    const state = location.state as RedirectState
    return <Navigate to={safeRedirectPath(state?.from)} replace />
  }
  return <Outlet />
}
