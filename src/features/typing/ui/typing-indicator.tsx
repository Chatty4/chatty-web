import { Fragment, useMemo } from "react"

import { useMemberNames } from "@/features/messages/hooks/use-member-names"

import { useTyping } from "../hooks/typing-context"
import { typingLabel } from "../store/typing"

export type TypingIndicatorProps = {
  channelId: string
  teamId: string
  /** Names already known, so only someone new has to be looked up. */
  names: Record<string, string>
}

/** The line above the composer. Keeps its height when empty, so the list doesn't jump. */
export function TypingIndicator({ channelId, teamId, names }: TypingIndicatorProps) {
  const { typingIn } = useTyping()
  const userIds = useMemo(() => typingIn(channelId), [typingIn, channelId])
  const unknownIds = useMemo(() => userIds.filter((id) => !names[id]), [userIds, names])
  const fetchedNames = useMemberNames(teamId, unknownIds)
  const label = typingLabel(userIds.map((id) => names[id] ?? fetchedNames[id]))

  return (
    <p role="status" className="h-5 truncate px-4 pt-1 text-xs text-muted-foreground">
      {label && (
        <>
          {label.names.map((name, index) => (
            <Fragment key={name}>
              {index > 0 && " and "}
              <span className="font-semibold text-foreground">{name}</span>
            </Fragment>
          ))}{" "}
          {label.text}
        </>
      )}
    </p>
  )
}
