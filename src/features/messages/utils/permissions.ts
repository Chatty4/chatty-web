// Who may edit or delete a message (chatty-infra/docs/decisions.md D-05, api-chat.md
// PUT / DELETE /messages/{id}). The server enforces the same rules; these only decide
// which actions the UI offers.

import type { LocalMessage } from "../types"

export type TeamRole = "owner" | "admin" | "member"

export type Actor = {
  userId: string
  /** My role in the channel's team, or null when unknown. */
  teamRole: TeamRole | null
}

/**
 * The channel as I see it. Pass null when the channel is not in my sidebar: then I'm
 * not a member, and a team owner/admin outside a private channel gets 404 on delete.
 */
export type ChannelAccess = {
  kind: "public" | "private" | "dm"
  archived: boolean
  /** My role in the channel. */
  myRole: "owner" | "member"
}

/** Deleted, pending and failed messages have no server-side state to change. */
function isActionable(message: LocalMessage): boolean {
  return message.deleted_at === null && message.status === "sent"
}

/** Anyone who can write in the channel can react. */
export function canReact(message: LocalMessage, channel: ChannelAccess | null): boolean {
  return !!channel && !channel.archived && isActionable(message)
}

/** Only the author can edit, and only while they can write in the channel. */
export function canEdit(message: LocalMessage, me: Actor, channel: ChannelAccess | null): boolean {
  if (!channel || channel.archived || !isActionable(message)) return false
  return message.author_id === me.userId
}

/**
 * The author can always delete. Outside DMs so can the channel owner and the team
 * owner/admin. Nothing can be deleted in an archived channel (409 channel_archived).
 */
export function canDelete(message: LocalMessage, me: Actor, channel: ChannelAccess | null): boolean {
  if (!channel || channel.archived || !isActionable(message)) return false
  if (message.author_id === me.userId) return true
  if (channel.kind === "dm") return false
  return channel.myRole === "owner" || me.teamRole === "owner" || me.teamRole === "admin"
}
