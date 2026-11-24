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
