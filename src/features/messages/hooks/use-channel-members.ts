import { useEffect, useState } from "react"

import {
  getChannelMembersRequest,
  getTeamMemberPreviewsRequest,
} from "@/features/channels/fetchers/channel-fetchers"

import type { MentionCandidate } from "../utils/mentions"

/**
 * Fetches the full member list for a channel and resolves display names.
 * Used to populate @mention autocomplete in the composer.
 */
export function useChannelMembers(
  channelId: string,
  teamId: string,
): MentionCandidate[] {
  const [members, setMembers] = useState<MentionCandidate[]>([])

  useEffect(() => {
    if (!channelId || !teamId) return
    let cancelled = false

    void (async () => {
      const { members: channelMembers } = await getChannelMembersRequest(channelId)
      if (cancelled || channelMembers.length === 0) return

      const userIds = channelMembers.map((m) => m.user_id)
      const { members: previews } = await getTeamMemberPreviewsRequest(teamId, userIds)
      if (!cancelled) {
        setMembers(previews.map((p) => ({ id: p.user_id, display_name: p.display_name })))
      }
    })()

    return () => { cancelled = true }
  }, [channelId, teamId])

  return members
}
