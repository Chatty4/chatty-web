import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { isSessionRejected } from "@/lib/api-error"
import {
  endSession,
  freshAccessToken,
  hasStoredSession,
  startSession,
  subscribeSession,
} from "@/lib/session"

import { loginRequest, logoutRequest, meRequest, registerRequest } from "../fetchers/auth-fetchers"
import type { AuthStatus, LoginInput, Me, RegisterInput, User } from "../types"
import { AccountCreatedError } from "../utils/errors"
import type { AuthContextValue } from "./auth-context"

type State = { status: AuthStatus; user: User | null }

const ANONYMOUS: State = { status: "anonymous", user: null }
const LOADING: State = { status: "loading", user: null }

function toUser({ id, email, display_name, avatar_file_id, timezone }: Me | User): User {
  return { id, email, display_name, avatar_file_id, timezone }
}

/** The state for the stored session: refresh the access token if needed, then load the user. */
async function loadSession(): Promise<State> {
  try {
    await freshAccessToken()
    const me = await meRequest()
    return { status: "authenticated", user: toUser(me) }
  } catch (error) {
    // Refresh token rejected, user deactivated, ...: the stored session is over.
    if (isSessionRejected(error)) {
      endSession()
      return ANONYMOUS
    }
    // Offline, rate limited, server down: keep the tokens and offer to try again.
    return { status: "unavailable", user: null }
  }
}

/** The session state behind AuthProvider: restore on load, login, register, logout, other tabs. */
export function useAuthState(): AuthContextValue {
  const [state, setState] = useState<State>(() => (hasStoredSession() ? LOADING : ANONYMOUS))
  // The latest state, readable from the session listener without re-subscribing.
  const stateRef = useRef(state)
  // Bumped by every restore, login and logout, so an older restore can't overwrite a newer result.
  const generation = useRef(0)

  const update = useCallback((next: State) => {
    stateRef.current = next
    setState(next)
  }, [])

  /** Load the user of the stored session, unless a newer restore, login or logout came first. */
  const load = useCallback(() => {
    const current = ++generation.current
    void loadSession().then((next) => {
      if (current === generation.current) update(next)
    })
  }, [update])

  // Restore the stored session once, when the app loads. The initial state is already "loading".
  useEffect(() => {
    if (hasStoredSession()) load()
  }, [load])

  // Logins and logouts in other tabs, and logouts forced by a rejected refresh token.
  useEffect(
    () =>
      subscribeSession((event) => {
        if (event === "logged-out") {
          generation.current++
          update(ANONYMOUS)
        } else if (stateRef.current.status !== "authenticated") {
          // Another tab logged in and shared its access token: load the user with it.
          update(LOADING)
          load()
        }
      }),
    [load, update],
  )

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await loginRequest(input)
      generation.current++
      // Before startSession(), whose "logged-in" event must not trigger a second load.
      update({ status: "authenticated", user: toUser(response.user) })
      startSession(response)
    },
    [update],
  )

  const register = useCallback(
    async (input: RegisterInput) => {
      await registerRequest(input)
      try {
        await login({ email: input.email, password: input.password })
      } catch (error) {
        throw new AccountCreatedError(error)
      }
    },
    [login],
  )

  const logout = useCallback(async () => {
    generation.current++
    await logoutRequest()
    update(ANONYMOUS)
  }, [update])

  const retry = useCallback(() => {
    update(LOADING)
    load()
  }, [load, update])

  const updateUser = useCallback(
    (user: User) => {
      update({ status: "authenticated", user })
    },
    [update],
  )

  return useMemo(
    () => ({ ...state, login, register, logout, retry, updateUser }),
    [state, login, register, logout, retry, updateUser],
  )
}
