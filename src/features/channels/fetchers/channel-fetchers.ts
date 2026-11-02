import { coreApi } from "@/lib/api"

import type {
  BrowsableChannel,
  ChannelDetail,
  ChannelMember,
  CreatedChannel,
  MemberPreview,
  MyChannelSettings,
  NotifyLevel,
  SidebarChannel,
} from "../types"

export function getSidebarChannelsRequest(
  teamId: string,
): Promise<{ channels: SidebarChannel[] }> {
  return coreApi.get(`/teams/${teamId}/channels`)
}

export function browseChannelsRequest(
  teamId: string,
  q?: string,
  cursor?: string,
): Promise<{ channels: BrowsableChannel[]; next_cursor: string | null }> {
  const params = new URLSearchParams()
  if (q) params.set("q", q)
  if (cursor) params.set("cursor", cursor)
  const qs = params.toString()
  return coreApi.get(`/teams/${teamId}/channels/browse${qs ? `?${qs}` : ""}`)
}

export function createChannelRequest(
  teamId: string,
  name: string,
  kind: "public" | "private",
  topic?: string,
): Promise<CreatedChannel> {
  const body: Record<string, unknown> = { name, kind }
  if (topic) body.topic = topic
  return coreApi.post(`/teams/${teamId}/channels`, body)
}

export function startDmRequest(
  teamId: string,
  userIds: string[],
): Promise<{ id: string; team_id: string; kind: "dm"; member_ids: string[]; created_at: string }> {
  return coreApi.post(`/teams/${teamId}/dms`, { user_ids: userIds })
}

export function getChannelRequest(channelId: string): Promise<ChannelDetail> {
  return coreApi.get(`/channels/${channelId}`)
}

export function updateChannelRequest(
  channelId: string,
  name: string,
  topic: string | null,
): Promise<ChannelDetail> {
  return coreApi.put(`/channels/${channelId}`, { name, topic })
}

export function archiveChannelRequest(channelId: string): Promise<ChannelDetail> {
  return coreApi.post(`/channels/${channelId}/archive`)
}

export function joinChannelRequest(
  channelId: string,
): Promise<MyChannelSettings & { channel_id: string }> {
  return coreApi.post(`/channels/${channelId}/join`)
}

export function leaveChannelRequest(channelId: string): Promise<void> {
  return coreApi.post(`/channels/${channelId}/leave`)
}

export function updateMyChannelSettingsRequest(
  channelId: string,
  settings: { notify_level: NotifyLevel; muted: boolean; hidden: boolean },
): Promise<MyChannelSettings & { channel_id: string }> {
  return coreApi.put(`/channels/${channelId}/me`, settings)
}

export function getChannelMembersRequest(
  channelId: string,
  cursor?: string,
): Promise<{ members: ChannelMember[]; next_cursor: string | null }> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""
  return coreApi.get(`/channels/${channelId}/members${qs}`)
}

export function addChannelMembersRequest(
  channelId: string,
  userIds: string[],
): Promise<{ added: string[]; already_members: string[] }> {
  return coreApi.post(`/channels/${channelId}/members`, { user_ids: userIds })
}

export function removeChannelMemberRequest(
  channelId: string,
  userId: string,
): Promise<void> {
  return coreApi.delete(`/channels/${channelId}/members/${userId}`)
}

/** Batch-fetch display names by user ID. Used to resolve DM participant names. */
export function getTeamMemberPreviewsRequest(
  teamId: string,
  userIds: string[],
): Promise<{ members: MemberPreview[]; next_cursor: null }> {
  return coreApi.get(`/teams/${teamId}/members?user_ids=${userIds.join(",")}`)
}
