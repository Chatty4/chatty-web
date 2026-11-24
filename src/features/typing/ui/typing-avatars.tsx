import { UserAvatar } from "@/components/app/user-avatar"
import type { MemberPreview } from "@/features/channels"

import { typingAvatars } from "../store/typing"

export type TypingAvatarsProps = {
  /** The users typing, first one first. */
  userIds: string[]
  /** Name and avatar of each user; one not loaded yet shows "?". */
  previews: Record<string, MemberPreview | undefined>
}

/**
 * The avatars of whoever is typing. One person: a full-size avatar with the presence dot, like a
 * message's. Several: smaller overlapping avatars, then "+N" for the people past the limit.
 */
export function TypingAvatars({ userIds, previews }: TypingAvatarsProps) {
  const { shown, more } = typingAvatars(userIds)
  if (shown.length === 0) return null

  if (shown.length === 1) {
    const preview = previews[shown[0]!]
    // Whoever is typing has a socket open, so they are online.
    return (
      <UserAvatar name={preview?.display_name ?? ""} avatarFileId={preview?.avatar_file_id} online />
    )
  }

  return (
    <div className="flex items-center -space-x-2">
      {shown.map((userId) => {
        const preview = previews[userId]
        return (
          <UserAvatar
            key={userId}
            name={preview?.display_name ?? ""}
            avatarFileId={preview?.avatar_file_id}
            className="size-6 text-[9px] ring-2 ring-surface"
          />
        )
      })}
      {more > 0 && (
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-hover text-[9px] font-semibold text-muted-foreground ring-2 ring-surface"
        >
          +{more}
        </span>
      )}
    </div>
  )
}
