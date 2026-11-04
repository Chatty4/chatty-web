import { useEffect, useState } from "react"

import {
  getAllChannelMembersRequest,
  getTeamMemberPreviewsRequest,
} from "@/features/channels/fetchers/channel-fetchers"

import type { MentionCandidate } from "../utils/mentions"

const NO_MEMBERS: MentionCandidate[] = []

type LoadedMembers = { channelId: string; members: MentionCandidate[] }

/**
 * Fetches the full member list for a channel and resolves display names.
 * Used to populate @mention autocomplete in the composer. Another channel's list is
 * never returned: there are no suggestions until this channel's list has arrived.
 */
export function useChannelMembers(channelId: string, teamId: string): MentionCandidate[] {
  const [loaded, setLoaded] = useState<LoadedMembers | null>(null)

  useEffect(() => {
    if (!channelId || !teamId) return
    let cancelled = false

    getAllChannelMembersRequest(channelId)
      .then((members) =>
        getTeamMemberPreviewsRequest(
          teamId,
          members.map((m) => m.user_id),
        ),
      )
      .then(({ members: previews }) => {
        if (cancelled) return
        setLoaded({
          channelId,
          members: previews.map((p) => ({ id: p.user_id, display_name: p.display_name })),
        })
      })
      .catch(() => {
        // Only suggestions are lost: the composer still sends, without autocomplete.
      })

    return () => {
      cancelled = true
    }
  }, [channelId, teamId])

  return loaded?.channelId === channelId ? loaded.members : NO_MEMBERS
}
