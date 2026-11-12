import type { PushStatus, SavePushSubscriptionInput } from "../types"

/** The VAPID public key (base64url, as in .env) as the bytes pushManager.subscribe() wants. */
export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** True when a subscription was made for this key. After a key change, old ones get 403 forever. */
export function isSameKey(current: ArrayBuffer | null, expected: Uint8Array): boolean {
  if (!current || current.byteLength !== expected.length) return false
  const bytes = new Uint8Array(current)
  return bytes.every((byte, i) => byte === expected[i])
}

/** The contract body from PushSubscription.toJSON(); the keys are already base64url there. */
export function toSaveInput(json: PushSubscriptionJSON): SavePushSubscriptionInput {
  const { endpoint, keys } = json
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error("Incomplete push subscription")
  return { endpoint, p256dh: keys.p256dh, auth: keys.auth }
}

/** Status of a browser that supports push and has a key configured. */
export function pushStatus(permission: NotificationPermission, subscribed: boolean): PushStatus {
  if (permission === "denied") return "blocked"
  return permission === "granted" && subscribed ? "on" : "off"
}
