// Uploads that run while the user writes: one entry per picked file, with its progress.

import { useCallback, useEffect, useRef, useState } from "react"

import { uuid } from "@/lib/uuid"

import { uploadFile } from "../fetchers/file-fetchers"
import type { FilePurpose, UploadedFile } from "../types"
import { describeUploadError } from "../utils/errors"
import { checkFile, IMAGE_MIMES } from "../utils/limits"

export type FileUpload = {
  key: string
  file: File
  /** 0..1 */
  progress: number
  status: "uploading" | "ready" | "failed"
  error?: string
  /** Set once the file is ready. */
  uploaded?: UploadedFile
  /** A local URL of the picked image, for a thumbnail. Only for images. */
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
    (file: File) => {
      const key = uuid()
      const preview = IMAGE_MIMES.includes(file.type) ? URL.createObjectURL(file) : undefined
      if (preview) previews.current.set(key, preview)

      const refused = checkFile(file, purpose)
      if (refused) {
        setUploads((list) => [
          ...list,
          { key, file, preview, progress: 0, status: "failed", error: refused },
        ])
        return
      }

      const controller = new AbortController()
      controllers.current.set(key, controller)
      setUploads((list) => [...list, { key, file, preview, progress: 0, status: "uploading" }])

      uploadFile(file, purpose, {
        teamId,
        signal: controller.signal,
        onProgress: (progress) => update(key, { progress }),
      })
        .then((uploaded) => update(key, { status: "ready", progress: 1, uploaded }))
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          update(key, { status: "failed", error: describeUploadError(error) })
        })
        .finally(() => controllers.current.delete(key))
    },
    [purpose, teamId],
  )

  const add = useCallback((files: Iterable<File>) => {
    for (const file of files) start(file)
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
