// Uploads that run while the user writes: one entry per picked file, with its progress. Photos
// are compressed first (utils/compress.ts); what is sent, and shown, is the compressed file.

import { useCallback, useEffect, useRef, useState } from "react"

import { uuid } from "@/lib/uuid"

import { uploadFile } from "../fetchers/file-fetchers"
import type { FilePurpose, UploadedFile } from "../types"
import { shouldCompress } from "../utils/compress"
import { compressImage } from "../utils/compress-image"
import { describeUploadError } from "../utils/errors"
import { checkFile, IMAGE_MIMES, VIDEO_MIMES } from "../utils/limits"

export type FileUpload = {
  key: string
  /** What is sent: the compressed photo once compressing is done, else the picked file. */
  file: File
  /** 0..1 */
  progress: number
  status: "compressing" | "uploading" | "ready" | "failed"
  error?: string
  /** Set once the file is ready. */
  uploaded?: UploadedFile
  /** A local URL of the picked image or video, for a thumbnail. Only for those. */
  preview?: string
}

export function useFileUploads(purpose: FilePurpose, teamId: string | null) {
  const [uploads, setUploads] = useState<FileUpload[]>([])
  const controllers = useRef(new Map<string, AbortController>())
  const previews = useRef(new Map<string, string>())

  const dropPreview = (key: string) => {
    const url = previews.current.get(key)
    if (url) URL.revokeObjectURL(url)
    previews.current.delete(key)
  }

  // Leaving the composer stops what is still uploading and frees the thumbnails.
  useEffect(() => {
    const running = controllers.current
    const thumbnails = previews.current
    return () => {
      running.forEach((controller) => controller.abort())
      thumbnails.forEach((url) => URL.revokeObjectURL(url))
      thumbnails.clear()
    }
  }, [])

  const update = (key: string, change: Partial<FileUpload>) =>
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...change } : u)))

  const start = useCallback(
    async (picked: File) => {
      const key = uuid()
      const preview = [...IMAGE_MIMES, ...VIDEO_MIMES].includes(picked.type) ? URL.createObjectURL(picked) : undefined
      if (preview) previews.current.set(key, preview)

      // Removing the chip aborts this, while compressing or uploading.
      const controller = new AbortController()
      controllers.current.set(key, controller)
      const compressing = shouldCompress(picked)
      setUploads((list) => [
        ...list,
        { key, file: picked, preview, progress: 0, status: compressing ? "compressing" : "uploading" },
      ])

      try {
        // Before the checks: a large photo that shrinks under the limit is fine.
        const file = compressing ? await compressImage(picked, purpose) : picked
        if (controller.signal.aborted) return

        const refused = checkFile(file, purpose)
        if (refused) return update(key, { file, status: "failed", error: refused })
        update(key, { file, status: "uploading" })

        const uploaded = await uploadFile(file, purpose, {
          teamId,
          signal: controller.signal,
          onProgress: (progress) => update(key, { progress }),
        })
        update(key, { status: "ready", progress: 1, uploaded })
      } catch (error) {
        if (!controller.signal.aborted) {
          update(key, { status: "failed", error: describeUploadError(error) })
        }
      } finally {
        controllers.current.delete(key)
      }
    },
    [purpose, teamId],
  )

  const add = useCallback((files: Iterable<File>) => {
    for (const file of files) void start(file)
  }, [start])

  // shortcut: a removed file that was already uploaded is left to chatty-core's cleanup job
  // (24 h, D-17); call DELETE /files/{id} if unused uploads start to count against the limit.
  const remove = useCallback((key: string) => {
    controllers.current.get(key)?.abort()
    controllers.current.delete(key)
    dropPreview(key)
    setUploads((list) => list.filter((u) => u.key !== key))
  }, [])

  const clear = useCallback(() => {
    previews.current.forEach((url) => URL.revokeObjectURL(url))
    previews.current.clear()
    setUploads([])
  }, [])

  return { uploads, add, remove, clear }
}
