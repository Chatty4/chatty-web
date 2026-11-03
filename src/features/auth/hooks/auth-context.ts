import { createContext, useContext } from "react"

import type { AuthStatus, LoginInput, RegisterInput, User } from "../types"

export type AuthContextValue = {
  status: AuthStatus
  /** Set only while status is "authenticated". */
  user: User | null
  login: (input: LoginInput) => Promise<void>
  /** Creates the account, then logs in with it. */
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
  /** Try to restore the stored session again (after "unavailable"). */
  retry: () => void
  /** Patch the in-memory user after a profile update (PUT /me). */
  updateUser: (user: User) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used inside AuthProvider")
  return value
}
