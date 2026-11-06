import { useEffect, useMemo } from "react"

import { Avatar } from "@/components/ui/avatar"
import { useMemberNames } from "@/features/messages/hooks/use-member-names"

import { useTyping } from "../hooks/typing-context"
import { typingLabel } from "../store/typing"
import { TypingDots } from "./typing-dots"

export type TypingIndicatorProps = {
  channelId: string
  teamId: string
  /** Names already known, so only someone new has to be looked up. */
  names: Record<string, string>
  /** Called when the row appears, so the list can keep it in view. Must be stable. */
  onShown: () => void
}

/** A row after the last message, laid out like one: who is typing, then the dots in a bubble. */
export function TypingIndicator({ channelId, teamId, names, onShown }: TypingIndicatorProps) {
  const { typingIn } = useTyping()
  const userIds = useMemo(() => typingIn(channelId), [typingIn, channelId])
  const unknownIds = useMemo(() => userIds.filter((id) => !names[id]), [userIds, names])
  const fetchedNames = useMemberNames(teamId, unknownIds)
  const label = typingLabel(userIds.map((id) => names[id] ?? fetchedNames[id]))

  const shown = label !== null
  useEffect(() => {
    if (shown) onShown()
  }, [shown, onShown])

  return (
    <div role="status">
      {label && (
        <div className="flex gap-2.5 px-4 py-0.5">
          <div className="w-8 shrink-0">
            {/* Whoever is typing has a socket open, so a single person is online. */}
            <Avatar name={label.names[0] ?? ""} online={userIds.length === 1} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-baseline gap-2">
              <strong className="truncate text-sm font-semibold leading-snug">
                {label.names.join(" and ")}
              </strong>
              <span className="shrink-0 text-xs text-muted-foreground">{label.text}</span>
            </div>
            <div className="flex h-[35px] w-fit items-center rounded-lg rounded-tl-sm bg-surface-hover px-3">
              <TypingDots />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
