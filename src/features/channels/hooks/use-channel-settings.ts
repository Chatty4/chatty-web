import { useCallback, useEffect, useRef, useState } from "react"

import {
  addChannelMembersRequest,
  archiveChannelRequest,
  getChannelMembersRequest,
  getChannelRequest,
  getTeamMemberPreviewsRequest,
  leaveChannelRequest,
  removeChannelMemberRequest,
  updateChannelRequest,
  updateMyChannelSettingsRequest,
} from "../fetchers/channel-fetchers"
import type { ChannelDetail, ChannelMember, NotifyLevel } from "../types"

export type ChannelSettingsState =
  | { status: "loading" }
  | {
      status: "loaded"
      forChannelId: string
      channel: ChannelDetail
      members: ChannelMember[]
      memberNames: Record<string, string>
    }
  | { status: "error"; forChannelId: string; message: string }

async function fetchChannelSettings(channelId: string): Promise<ChannelSettingsState> {
  try {
    const [channel, membersPage] = await Promise.all([
      getChannelRequest(channelId),
      getChannelMembersRequest(channelId),
    ])

    // Batch-resolve display names for channel members
    const userIds = membersPage.members.map((m) => m.user_id)
    const memberNames: Record<string, string> = {}
    if (userIds.length > 0 && channel.team_id) {
      const { members: previews } = await getTeamMemberPreviewsRequest(channel.team_id, userIds)
      for (const p of previews) memberNames[p.user_id] = p.display_name
    }

    return {
      status: "loaded",
      forChannelId: channelId,
      channel,
      members: membersPage.members,
      memberNames,
    }
  } catch {
    return { status: "error", forChannelId: channelId, message: "Could not load channel settings." }
  }
}

/** Loads channel details + members for the settings panel and provides mutation functions. */
export function useChannelSettings(channelId: string) {
  const [state, setState] = useState<ChannelSettingsState>({ status: "loading" })
  const generation = useRef(0)

  const load = useCallback((cid: string) => {
    const current = ++generation.current
    void fetchChannelSettings(cid).then((next) => {
      if (current === generation.current) setState(next)
    })
  }, [])

  useEffect(() => {
    load(channelId)
  }, [channelId, load])

  const currentState: ChannelSettingsState =
    state.status !== "loading" && state.forChannelId !== channelId
      ? { status: "loading" }
      : state

  const renameChannel = useCallback(
    async (name: string, topic: string | null) => {
      const updated = await updateChannelRequest(channelId, name, topic)
      setState((prev) =>
        prev.status === "loaded" && prev.forChannelId === channelId
          ? { ...prev, channel: updated }
          : prev,
      )
    },
    [channelId],
  )

  const archiveChannel = useCallback(async () => {
    const updated = await archiveChannelRequest(channelId)
    setState((prev) =>
      prev.status === "loaded" && prev.forChannelId === channelId
        ? { ...prev, channel: updated }
        : prev,
    )
  }, [channelId])

  const leaveChannel = useCallback(async () => {
    await leaveChannelRequest(channelId)
  }, [channelId])

  const updateNotifications = useCallback(
    async (settings: { notify_level: NotifyLevel; muted: boolean; hidden: boolean }) => {
      await updateMyChannelSettingsRequest(channelId, settings)
      setState((prev) => {
        if (prev.status !== "loaded" || !prev.channel.my) return prev
        return {
          ...prev,
          channel: { ...prev.channel, my: { ...prev.channel.my, ...settings } },
        }
      })
    },
    [channelId],
  )

  const addMembers = useCallback(
    async (userIds: string[], teamId: string) => {
      await addChannelMembersRequest(channelId, userIds)
      // Reload members to get accurate list after adding
      const [membersPage, previews] = await Promise.all([
        getChannelMembersRequest(channelId),
        getTeamMemberPreviewsRequest(teamId, userIds),
      ])
      const newNames: Record<string, string> = {}
      for (const p of previews.members) newNames[p.user_id] = p.display_name
      setState((prev) => {
        if (prev.status !== "loaded") return prev
        return {
          ...prev,
          members: membersPage.members,
          memberNames: { ...prev.memberNames, ...newNames },
        }
      })
    },
    [channelId],
  )

  const removeMember = useCallback(
    async (userId: string) => {
      await removeChannelMemberRequest(channelId, userId)
      setState((prev) =>
        prev.status === "loaded"
          ? { ...prev, members: prev.members.filter((m) => m.user_id !== userId) }
          : prev,
      )
    },
    [channelId],
  )

  return {
    state: currentState,
    renameChannel,
    archiveChannel,
    leaveChannel,
    updateNotifications,
    addMembers,
    removeMember,
  }
}
