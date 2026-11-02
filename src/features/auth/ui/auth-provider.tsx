import type { ReactNode } from "react"

import { AuthContext } from "../hooks/auth-context"
import { useAuthState } from "../hooks/use-auth-state"

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthState()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}
