import { useParams } from "react-router"

import { PagePlaceholder } from "@/components/app/page-placeholder"

/** The invite landing page (CHAT-195). */
export function InvitePage() {
  const { inviteCode } = useParams()

  return (
    <div className="w-full max-w-[420px] rounded-md border bg-surface p-7">
      <PagePlaceholder title="Join a team">
        <p className="text-sm">
          Invite code: <code>{inviteCode}</code>
        </p>
      </PagePlaceholder>
    </div>
  )
}
