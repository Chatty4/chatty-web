import { UserAvatar } from "@/components/app/user-avatar"
import { Dialog } from "@/components/ui/dialog"
import type { MemberPreview } from "@/features/channels"

import type { Positions } from "../store/reads"
import { seenBy, type ReceiptMessage } from "../store/receipts"

type SeenByDialogProps = {
  /** The channel's live positions; the lists update while the dialog is open. */
  positions: Positions | null
  message: Pick<ReceiptMessage, "author_id" | "seq">
  /** userId → name and avatar. A member not loaded yet shows as "Unknown member". */
  previews: Record<string, MemberPreview>
  onClose: () => void
}

/** Who has seen my message and who hasn't yet, from the Info action. */
export function SeenByDialog({ positions, message, previews, onClose }: SeenByDialogProps) {
  const { seen, notSeen } = positions ? seenBy(positions, message) : { seen: [], notSeen: [] }

  return (
    <Dialog open title="Message info" onClose={onClose}>
      {positions ? (
        <div className="flex flex-col gap-5">
          <PeopleList title="Seen by" userIds={seen} previews={previews} empty="Nobody yet" />
          <PeopleList
            title="Not seen yet"
            userIds={notSeen}
            previews={previews}
            empty="Everyone has seen it"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Couldn't load who has seen this message.</p>
      )}
    </Dialog>
  )
}

function PeopleList({
  title,
  userIds,
  previews,
  empty,
}: {
  title: string
  userIds: string[]
  previews: Record<string, MemberPreview>
  empty: string
}) {
  return (
    <section aria-label={title}>
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
        {userIds.length > 0 && <span className="ml-1 font-normal">({userIds.length})</span>}
      </h3>
      {userIds.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {userIds.map((userId) => {
            const name = previews[userId]?.display_name ?? "Unknown member"
            return (
              <li key={userId} className="flex items-center gap-2.5 text-sm">
                <UserAvatar name={name} avatarFileId={previews[userId]?.avatar_file_id} />
                <span className="truncate">{name}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
