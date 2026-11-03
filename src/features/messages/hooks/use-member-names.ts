import { useEffect, useRef, useState } from "react"

import { getTeamMemberPreviewsRequest } from "@/features/channels/fetchers/channel-fetchers"

/**
 * Lazily resolves user IDs to display names via the team members API.
 * Returns a stable `Record<userId, displayName>` that grows as new IDs appear.
 */
export function useMemberNames(
  teamId: string,
  userIds: string[],
): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({})
  // Track which IDs we've already fetched or are fetching to avoid duplicate requests.
  const fetchedIds = useRef(new Set<string>())

  useEffect(() => {
    if (!teamId) return
    const missing = userIds.filter((id) => !fetchedIds.current.has(id))
    if (missing.length === 0) return

    for (const id of missing) fetchedIds.current.add(id)

    void getTeamMemberPreviewsRequest(teamId, missing).then(({ members }) => {
      setNames((prev) => {
        const next = { ...prev }
        for (const m of members) next[m.user_id] = m.display_name
        return next
      })
    })
  }, [teamId, userIds])

  return names
}
