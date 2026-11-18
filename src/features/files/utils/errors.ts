import { ApiError } from "@/lib/api-error"

/** User-facing text for a failed upload: POST /files, the PUT to MinIO, or confirm (api-core.md). */
export function describeUploadError(error: unknown): string {
  const code = error instanceof ApiError ? error.code : undefined
  switch (code) {
    case "file_too_large":
      return "The file is too large."
    case "type_not_allowed":
      return "This type of file can't be uploaded."
    case "rate_limited":
      return "Too many uploads at once. Wait a minute and try again."
    case "upload_expired":
      return "The upload took too long. Try again."
    case "upload_mismatch":
      return "The file doesn't match its type, or it is a program."
    case "network_error":
      return "The upload failed. Check your connection and try again."
    default:
      return "The upload failed. Try again."
  }
}
