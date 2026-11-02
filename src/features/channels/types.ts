export type ChannelKind = "public" | "private" | "dm"
export type NotifyLevel = "all" | "mentions" | "none"

export type MyChannelSettings = {
  role: "owner" | "member"
  notify_level: NotifyLevel
  muted: boolean
  hidden: boolean
}

/** Item returned by GET /teams/:teamId/channels — the sidebar list. */
export type SidebarChannel = {
  id: string
  kind: ChannelKind
  name: string | null
  topic: string | null
  is_default: boolean
  archived: boolean
  dm_member_ids: string[] | null
  my: MyChannelSettings
}

/** Item returned by GET /teams/:teamId/channels/browse. */
export type BrowsableChannel = {
  id: string
  name: string
  topic: string | null
  member_count: number
  archived: boolean
}

/** Full channel object from GET /channels/:channelId. */
export type ChannelDetail = {
  id: string
  team_id: string
  kind: ChannelKind
  name: string | null
  topic: string | null
  is_default: boolean
  archived: boolean
  member_count: number
  created_by: string
  created_at: string
  my: MyChannelSettings | null
}

/** Returned by POST /teams/:teamId/channels. */
export type CreatedChannel = {
  id: string
  team_id: string
  kind: ChannelKind
  name: string
  topic: string | null
  is_default: boolean
  archived: boolean
  created_by: string
  created_at: string
}

/** Returned by GET /channels/:channelId/members. */
export type ChannelMember = {
  user_id: string
  role: "owner" | "member"
  joined_at: string
}

/** Minimal member preview used for resolving DM display names. */
export type MemberPreview = {
  user_id: string
  display_name: string
  avatar_file_id: string | null
}
