// Who can manage a channel (chatty-infra/docs/api-core.md: PUT /channels/{id}, archive,
// remove members). The server enforces it; this only decides which actions the UI offers.

import type { Role } from "@/features/teams"

import type { ChannelDetail } from "../types"

/** The channel owner, or a team owner or admin. Never for a DM: DMs have no owner. */
export function canManageChannel(
  channel: Pick<ChannelDetail, "kind" | "my">,
  teamRole: Role | null,
): boolean {
  if (channel.kind === "dm") return false
  return channel.my?.role === "owner" || teamRole === "owner" || teamRole === "admin"
}

/**
 * Leave a channel I'm in (api-core.md, POST /channels/{id}/leave). Not one I only view
 * (403 not_a_member), not a DM (hidden instead) and not the default channel.
 */
export function canLeaveChannel(
  channel: Pick<ChannelDetail, "kind" | "my" | "is_default">,
): boolean {
  return channel.kind !== "dm" && !channel.is_default && channel.my !== null
}

/**
 * Whether the details panel has an Archive tab: never for a DM, and otherwise only when it shows
 * something (the default channel's note, "Archived", Archive, or Leave).
 */
export function hasArchiveTab(
  channel: Pick<ChannelDetail, "kind" | "my" | "is_default" | "archived">,
  canManage: boolean,
): boolean {
  if (channel.kind === "dm") return false
  return channel.is_default || channel.archived || canManage || canLeaveChannel(channel)
}

/** Notification settings belong to my membership (PUT /channels/{id}/me: members only). */
export function hasNotificationsTab(channel: Pick<ChannelDetail, "my">): boolean {
  return channel.my !== null
}
