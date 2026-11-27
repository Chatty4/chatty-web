import { type ReactNode, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { toast } from "@/lib/toast"

import { uploadFile } from "../fetchers/file-fetchers"
import { compressImage } from "../utils/compress-image"
import { describeUploadError } from "../utils/errors"
import { checkFile, IMAGE_MIMES } from "../utils/limits"

type ImageUploadRowProps = {
  /** The current image, drawn by the caller (a round avatar, a square team icon, ...). */
  preview: ReactNode
  title: string
  purpose: "avatar" | "team_icon"
  /** The team of a team icon; null for an avatar. */
  teamId: string | null
  /** The current file, or null: Remove shows only when there is one. */
  fileId: string | null
  /** Saves a ready file, or null to remove the image. */
  onChange: (fileId: string | null) => Promise<void>
  /** Shown on success, e.g. "Profile photo saved". */
  savedMessage: string
}

/** An avatar or team icon with Upload and Remove: uploads the picked image, then saves it. */
export function ImageUploadRow({
  preview,
  title,
  purpose,
  teamId,
  fileId,
  onChange,
  savedMessage,
}: ImageUploadRowProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [compressing, setCompressing] = useState(false)
  // 0..1 while uploading, null otherwise.
  const [progress, setProgress] = useState<number | null>(null)
  const [removing, setRemoving] = useState(false)
  const busy = compressing || progress !== null || removing

  const upload = async (picked: File) => {
    // Shrunk to 512 px first, so a large phone photo fits under the 2 MB limit.
    setCompressing(true)
    const file = await compressImage(picked, purpose)
    setCompressing(false)

    const refused = checkFile(file, purpose)
    if (refused) return toast.error(refused)
    setProgress(0)
    try {
      const uploaded = await uploadFile(file, purpose, { teamId, onProgress: setProgress })
      await onChange(uploaded.id)
      toast.success(savedMessage)
    } catch (error) {
      toast.error(describeUploadError(error))
    } finally {
      setProgress(null)
    }
  }

  const remove = async () => {
    setRemoving(true)
    try {
      await onChange(null)
    } catch {
      toast.error("Could not remove the image. Try again.")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {preview}
      <div className="flex min-w-0 flex-1 flex-col">
        <strong className="text-sm font-medium">{title}</strong>
        <span className="text-[12px] text-muted-foreground">
          {compressing
            ? "Compressing…"
            : progress !== null
              ? `Uploading… ${Math.round(progress * 100)}%`
              : "PNG, JPEG, WebP or GIF, up to 2 MB."}
        </span>
      </div>
      {fileId && (
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => void remove()}>
          Remove
        </Button>
      )}
      <Button variant="ghost" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
        Upload
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_MIMES.join(",")}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = "" // so the same file can be picked again
          if (file) void upload(file)
        }}
      />
    </div>
  )
}
