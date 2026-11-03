import { Hash, Lock, UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"

export type ChannelIntroProps =
  | {
      kind: "public" | "private"
      name: string
      topic: string | null
      /** Opens the channel's member list. */
      onManagePeople: () => void
    }
  | { kind: "dm"; name: string }

/** The welcome block at the very start of a channel's history. */
export function ChannelIntro(props: ChannelIntroProps) {
  const Icon = props.kind === "dm" ? UserRound : props.kind === "private" ? Lock : Hash

  return (
    <div className="flex max-w-[680px] flex-col items-start gap-[7px] px-7 pt-[54px] pb-[26px] max-sm:px-[18px] max-sm:pt-9 max-sm:pb-5">
      <div className="mb-[5px] grid size-[46px] place-items-center rounded-md border bg-surface-subtle text-muted-foreground">
        <Icon className="size-[25px]" aria-hidden="true" />
      </div>
      {props.kind === "dm" ? (
        <>
          <strong className="text-xl font-semibold tracking-[-0.02em]">{props.name}</strong>
          <span className="text-muted-foreground">
            This conversation is only visible to its members.
          </span>
        </>
      ) : (
        <>
          <strong className="text-xl font-semibold tracking-[-0.02em]">
            Welcome to #{props.name}
          </strong>
          <span className="text-muted-foreground">
            {props.topic || `This is the start of the ${props.name} channel.`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 text-primary hover:not-disabled:text-primary"
            onClick={props.onManagePeople}
          >
            <UserRound />
            Manage people
          </Button>
        </>
      )}
    </div>
  )
}
