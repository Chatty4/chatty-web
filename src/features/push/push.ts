// Web Push for this browser (CHAT-219, D-13). The service worker is public/sw.js; chatty-chat's
// push worker sends to the subscription saved here.

import { VAPID_PUBLIC_KEY } from "@/lib/config"

import { deletePushSubscriptionRequest, savePushSubscriptionRequest } from "./fetchers/push-fetchers"
import type { PushStatus } from "./types"
import { base64UrlToBytes, isSameKey, pushStatus, toSaveInput } from "./utils/subscription"

const SERVICE_WORKER_URL = "/sw.js"

function isSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration()
  return (await registration?.pushManager.getSubscription()) ?? null
}

/** A subscription for today's key: reuses the browser's one, or replaces one made for another key. */
async function subscriptionForKey(registration: ServiceWorkerRegistration) {
  const key = base64UrlToBytes(VAPID_PUBLIC_KEY)
  const existing = await registration.pushManager.getSubscription()
  if (existing && isSameKey(existing.options.applicationServerKey, key)) return existing
  await existing?.unsubscribe()
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
}

function save(subscription: PushSubscription): Promise<void> {
  return savePushSubscriptionRequest(toSaveInput(subscription.toJSON()))
}

export async function readPushStatus(): Promise<PushStatus> {
  if (!isSupported()) return "unsupported"
  if (!VAPID_PUBLIC_KEY) return "unconfigured"
  return pushStatus(Notification.permission, (await currentSubscription()) !== null)
}

/** Asks for permission (call it from a click), subscribes and saves. Returns the new status. */
export async function enablePush(): Promise<PushStatus> {
  if (!isSupported() || !VAPID_PUBLIC_KEY) return readPushStatus()
  const permission = await Notification.requestPermission()
  if (permission !== "granted") return pushStatus(permission, false)
  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL)
  await navigator.serviceWorker.ready
  await save(await subscriptionForKey(registration))
  return "on"
}

/**
 * Stops pushes to this browser. The browser side is unsubscribed even when the DELETE fails
 * (offline): the push service then answers 410 and the worker deletes the row itself.
 */
export async function disablePush(): Promise<void> {
  if (!isSupported()) return
  const subscription = await currentSubscription()
  if (!subscription) return
  try {
    await deletePushSubscriptionRequest(subscription.endpoint)
  } finally {
    await subscription.unsubscribe()
  }
}

/**
 * On every app start, for a browser that turned push on: saves the subscription again, because
 * browsers sometimes change it (api-chat.md#post-push-subscriptions). Never asks for permission.
 */
export async function resavePushSubscription(): Promise<void> {
  if (!isSupported() || !VAPID_PUBLIC_KEY || Notification.permission !== "granted") return
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration || !(await registration.pushManager.getSubscription())) return
  await save(await subscriptionForKey(registration))
}
