import { useParams } from "react-router"

import { PagePlaceholder } from "@/components/PagePlaceholder"

export function InvitePage() {
  const { inviteCode } = useParams()

  return (
    <PagePlaceholder title="Join a team">
      <p className="text-sm">
        Invite code: <code>{inviteCode}</code>
      </p>
    </PagePlaceholder>
  )
}
