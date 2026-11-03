/** A DM's title: the other participants' names, or "Just you" for a self-DM. */
export function dmDisplayName(
  dmMemberIds: string[],
  myUserId: string,
  memberNames: Record<string, string>,
): string {
  const others = dmMemberIds.filter((id) => id !== myUserId)
  if (others.length === 0) return "Just you"
  return others.map((id) => memberNames[id] ?? "…").join(", ")
}
