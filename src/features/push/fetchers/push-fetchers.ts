import { chatApi, request } from "@/lib/api"
import { CHAT_API_URL } from "@/lib/config"

import type { SavePushSubscriptionInput } from "../types"

/** POST /push/subscriptions: saves this browser for the current user (also moves it from another). */
export function savePushSubscriptionRequest(input: SavePushSubscriptionInput): Promise<void> {
  return chatApi.post<void>("/push/subscriptions", input)
}

/** DELETE /push/subscriptions. The endpoint goes in the body, so it never ends up in access logs. */
export function deletePushSubscriptionRequest(endpoint: string): Promise<void> {
  return request<void>(`${CHAT_API_URL}/push/subscriptions`, {
    method: "DELETE",
    body: { endpoint },
  })
}
