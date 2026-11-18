// The 3-step upload from api-core.md, Files: POST /files, PUT to MinIO, POST /files/{id}/confirm.

import { ApiError, coreApi } from "@/lib/api"
import { networkError } from "@/lib/api-error"

import type { CreateUploadRequest, CreateUploadResponse, FilePurpose, UploadedFile } from "../types"
import { mimeOf } from "../utils/limits"

/** Step 1: a pending file and its presigned upload URL. */
export function createUploadApi(input: CreateUploadRequest): Promise<CreateUploadResponse> {
  return coreApi.post<CreateUploadResponse>("/files", input)
}

/** Step 3: chatty-core checks the uploaded object and marks the file ready. */
export function confirmUploadApi(fileId: string): Promise<UploadedFile> {
  return coreApi.post<UploadedFile>(`/files/${fileId}/confirm`)
}

/**
 * Step 2: the bytes go straight to MinIO, without a token. XMLHttpRequest, because fetch can't
 * report upload progress. `onProgress` gets 0..1.
 */
export function putToUploadUrl(
  upload: CreateUploadResponse,
  file: File,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(upload.upload_method, upload.upload_url)
    for (const [name, value] of Object.entries(upload.upload_headers)) {
      // The browser sets Content-Length itself and refuses it from code.
      if (name.toLowerCase() !== "content-length") xhr.setRequestHeader(name, value)
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new ApiError(xhr.status, "upload_failed", "MinIO refused the upload"))
    }
    xhr.onerror = () => reject(networkError())
    xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"))

    if (signal?.aborted) return reject(new DOMException("Upload aborted", "AbortError"))
    signal?.addEventListener("abort", () => xhr.abort(), { once: true })
    xhr.send(file)
  })
}

export type UploadOptions = {
  /** Required for attachment and team_icon, null for avatar. */
  teamId: string | null
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

/** Runs the 3 steps and returns the ready file. */
export async function uploadFile(
  file: File,
  purpose: FilePurpose,
  { teamId, onProgress, signal }: UploadOptions,
): Promise<UploadedFile> {
  const upload = await createUploadApi({
    purpose,
    team_id: teamId,
    filename: file.name,
    mime: mimeOf(file),
    size: file.size,
  })
  await putToUploadUrl(upload, file, onProgress, signal)
  return confirmUploadApi(upload.file_id)
}
