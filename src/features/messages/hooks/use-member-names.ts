import { useEffect, useMemo, useRef, useState } from "react"

import { getTeamMemberPreviewsRequest } from "@/features/channels/fetchers/channel-fetchers"
import type { MemberPreview } from "@/features/channels/types"

/**
 * Lazily resolves user IDs to their name and avatar via the team members API.
 * Returns a stable `Record<userId, MemberPreview>` that grows as new IDs appear.
 */
export function useMemberPreviews(
  teamId: string,
  userIds: string[],
): Record<string, MemberPreview> {
  const [previews, setPreviews] = useState<Record<string, MemberPreview>>({})
  // Track which IDs we've already fetched or are fetching to avoid duplicate requests.
  const fetchedIds = useRef(new Set<string>())

  useEffect(() => {
    if (!teamId) return
    const missing = userIds.filter((id) => !fetchedIds.current.has(id))
    if (missing.length === 0) return

    for (const id of missing) fetchedIds.current.add(id)

    getTeamMemberPreviewsRequest(teamId, missing)
      .then(({ members }) => {
        setPreviews((prev) => {
          const next = { ...prev }
          for (const m of members) next[m.user_id] = m
          return next
        })
      })
      .catch(() => {
        // Not fetched after all: the next list change asks for these again.
        for (const id of missing) fetchedIds.current.delete(id)
      })
  }, [teamId, userIds])

  return previews
}

/** userId -> display name, from `useMemberPreviews`. */
export function namesOf(previews: Record<string, MemberPreview>): Record<string, string> {
  return Object.fromEntries(Object.values(previews).map((p) => [p.user_id, p.display_name]))
}

/** Just the display names of `useMemberPreviews`. */
export function useMemberNames(teamId: string, userIds: string[]): Record<string, string> {
  const previews = useMemberPreviews(teamId, userIds)
  return useMemo(() => namesOf(previews), [previews])
}
