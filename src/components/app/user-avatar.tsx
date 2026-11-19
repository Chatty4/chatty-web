import type { ComponentProps } from "react"

import { Avatar } from "@/components/ui/avatar"
import { useFileImage } from "@/features/files"

/** A person's avatar image (GET /files/{id}), or their initials while it loads or when there is none. */
export function UserAvatar({
  avatarFileId,
  ...props
}: Omit<ComponentProps<typeof Avatar>, "src"> & { avatarFileId: string | null | undefined }) {
  return <Avatar {...props} src={useFileImage(avatarFileId)} />
}
