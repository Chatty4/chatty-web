import { useEffect, useMemo, useReducer, useRef, useState } from "react"

import {
  getAllChannelMembersRequest,
  getTeamMemberPreviewsRequest,
} from "@/features/channels/fetchers/channel-fetchers"
import { useWs } from "@/features/ws"

import { unknownAuthor } from "../utils/channel-members"
import type { MentionCandidate } from "../utils/mentions"

const NO_MEMBERS: MentionCandidate[] = []

type LoadedMembers = { channelId: string; members: MentionCandidate[] }

/**
 * Fetches the full member list for a channel and resolves display names.
 * Used to populate @mention autocomplete in the composer. Another channel's list is
 * never returned: there are no suggestions until this channel's list has arrived.
 *
 * Nothing on the WebSocket says someone joined, so the list is fetched again when a message
 * comes from someone it doesn't have, and after a reconnect, which may have missed one.
 */
export function useChannelMembers(channelId: string, teamId: string): MentionCandidate[] {
  const { subscribe, onReconnect } = useWs()
  const [loaded, setLoaded] = useState<LoadedMembers | null>(null)
  const [version, refresh] = useReducer((n: number) => n + 1, 0)

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
  }, [channelId, teamId, version])

  const members = loaded?.channelId === channelId ? loaded.members : null
  const memberIds = useMemo(() => members && new Set(members.map((m) => m.id)), [members])

  // Read from the WebSocket handler without subscribing again on every list change.
  const memberIdsRef = useRef(memberIds)
  useEffect(() => { memberIdsRef.current = memberIds }, [memberIds])

  // Authors already asked about in this channel, so a refetch that doesn't list them (a
  // failed request, or someone who left the team) isn't repeated on each of their messages.
  const askedRef = useRef(new Set<string>())
  useEffect(() => { askedRef.current = new Set() }, [channelId])

  useEffect(
    () =>
      subscribe((message) => {
        const author = unknownAuthor(message, channelId, memberIdsRef.current)
        if (author === null || askedRef.current.has(author)) return
        askedRef.current.add(author)
        refresh()
      }),
    [subscribe, channelId],
  )

  useEffect(() => onReconnect(refresh), [onReconnect])

  return members ?? NO_MEMBERS
}
