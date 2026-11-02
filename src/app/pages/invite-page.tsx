import { useParams } from "react-router"

import { InviteLandingPage } from "@/features/invites/ui/invite-landing-page"
import { NotFoundPage } from "./not-found-page"

export function InvitePage() {
  const { inviteCode } = useParams()
  if (!inviteCode) return <NotFoundPage />
  return <InviteLandingPage code={inviteCode} />
}
