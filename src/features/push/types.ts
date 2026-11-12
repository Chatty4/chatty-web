/** Body of POST /push/subscriptions (api-chat.md#post-push-subscriptions). */
export type SavePushSubscriptionInput = {
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * What this browser can do about push:
 * - unsupported: no service worker or Push API (e.g. an insecure origin)
 * - unconfigured: the app was built without VITE_VAPID_PUBLIC_KEY
 * - blocked: the user denied notifications; only the browser's site settings can undo it
 * - off / on: whether this browser has a subscription
 */
export type PushStatus = "unsupported" | "unconfigured" | "blocked" | "off" | "on"
