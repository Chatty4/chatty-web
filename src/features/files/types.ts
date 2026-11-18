// Types for file uploads. Contract: chatty-infra/docs/api-core.md, Files.

export type FilePurpose = "avatar" | "team_icon" | "attachment"

/** POST /files request body (step 1). */
export type CreateUploadRequest = {
  purpose: FilePurpose
  team_id: string | null
  filename: string
  mime: string
  size: number
}

/** POST /files response (step 1). */
export type CreateUploadResponse = {
  file_id: string
  upload_url: string
  upload_method: "PUT"
  upload_headers: Record<string, string>
  expires_at: string
}

/** POST /files/{file_id}/confirm response (step 3). */
export type UploadedFile = {
  id: string
  purpose: FilePurpose
  team_id: string | null
  filename: string
  mime: string
  size: number
  status: "pending" | "ready"
  created_at: string
}
