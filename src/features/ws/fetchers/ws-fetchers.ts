import { chatApi } from "@/lib/api"
import type { SyncCursors, SyncResponse } from "../types"

/** POST /sync — fetch missed events for every channel after a reconnect. */
export function syncRequest(cursors: SyncCursors): Promise<SyncResponse> {
  return chatApi.post<SyncResponse>("/sync", { cursors })
}
