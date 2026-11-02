import type { TokenPair } from "@/lib/session"

/** The user object of api-core.md (register, login and GET /me). */
export type User = {
  id: string
  email: string
  display_name: string
  avatar_file_id: string | null
  timezone: string
}

export type MyTeam = {
  team_id: string
  name: string
  icon_file_id: string | null
  role: "owner" | "admin" | "member"
}

/** GET /me */
export type Me = User & {
  date_joined: string
  teams: MyTeam[]
}

/** POST /auth/login */
export type LoginResponse = TokenPair & {
  token_type: "Bearer"
  refresh_expires_in: number
  user: User
}

export type LoginInput = {
  email: string
  password: string
}

export type RegisterInput = LoginInput & {
  display_name: string
}

/**
 * - loading: restoring a stored session
 * - unavailable: a stored session couldn't be checked because chatty-core is unreachable
 */
export type AuthStatus = "loading" | "authenticated" | "anonymous" | "unavailable"

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>
