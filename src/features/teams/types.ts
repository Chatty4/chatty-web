export type Role = "owner" | "admin" | "member"

/** A team as returned by GET /teams (the sidebar list). */
export type TeamListItem = {
  id: string
  name: string
  icon_file_id: string | null
  role: Role
  member_count: number
  created_at: string
}

/** A team as returned by GET /teams/:teamId (the settings page). */
export type Team = {
  id: string
  name: string
  icon_file_id: string | null
  my_role: Role
  member_count: number
  created_by: string
  created_at: string
}

/** POST /teams response also includes the general channel id. */
export type CreateTeamResult = TeamListItem & { general_channel_id: string }

/** One member from GET /teams/:teamId/members. */
export type TeamMember = {
  user_id: string
  display_name: string
  avatar_file_id: string | null
  role: Role
  is_active: boolean
  joined_at: string
}
