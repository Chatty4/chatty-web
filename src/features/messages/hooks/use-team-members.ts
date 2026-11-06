import { useEffect, useState } from "react"

import { getAllTeamMembersRequest } from "@/features/teams/fetchers/team-fetchers"

import type { MentionCandidate } from "../utils/mentions"

const NO_MEMBERS: MentionCandidate[] = []

type LoadedMembers = { teamId: string; members: MentionCandidate[] }

/**
 * The active members of a team, for @mention autocomplete. Anyone in the team can be
 * mentioned; only channel members are notified (api-chat.md, message object). Another
 * team's list is never returned: there are no suggestions until this team's list arrives.
 */
export function useTeamMembers(teamId: string): MentionCandidate[] {
  const [loaded, setLoaded] = useState<LoadedMembers | null>(null)

  useEffect(() => {
    if (!teamId) return
    let cancelled = false

    getAllTeamMembersRequest(teamId)
      .then((members) => {
        if (cancelled) return
        setLoaded({
          teamId,
          members: members
            .filter((m) => m.is_active)
            .map((m) => ({ id: m.user_id, display_name: m.display_name })),
        })
      })
      .catch(() => {
        // Only suggestions are lost: the composer still sends, without autocomplete.
      })

    return () => {
      cancelled = true
    }
  }, [teamId])

  return loaded?.teamId === teamId ? loaded.members : NO_MEMBERS
}
