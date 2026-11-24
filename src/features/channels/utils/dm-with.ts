// "New conversation with…" from a DM: the start DM page opens with the DM's people selected.
// A DM can't change its members (api-core.md, POST /channels/{id}/members: not_allowed_for_dm),
// so adding someone means opening the DM of the larger group (POST /teams/{id}/dms).

/** Other people a DM can have, besides me (api-core.md, POST /teams/{team_id}/dms). */
export const MAX_DM_OTHERS = 7

/** The start DM page with these people selected, me left out. */
export function startDmWithUrl(teamId: string, userIds: string[], myUserId: string): string {
  const others = userIds.filter((id) => id !== myUserId)
  if (others.length === 0) return `/teams/${teamId}/dms/new`
  return `/teams/${teamId}/dms/new?with=${others.map(encodeURIComponent).join(",")}`
}

/** The people `?with=` asks to select: no duplicates, never me, at most MAX_DM_OTHERS. */
export function parseStartDmWith(param: string | null, myUserId: string): string[] {
  if (!param) return []
  const ids = param
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id && id !== myUserId)
  return [...new Set(ids)].slice(0, MAX_DM_OTHERS)
}
