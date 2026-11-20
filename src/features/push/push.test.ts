import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { deletePushSubscriptionRequest } from "./fetchers/push-fetchers"
import { disablePush, forgetPushSubscription } from "./push"

vi.mock("./fetchers/push-fetchers", () => ({
  deletePushSubscriptionRequest: vi.fn(() => Promise.resolve()),
  savePushSubscriptionRequest: vi.fn(() => Promise.resolve()),
}))

/** A browser with push support whose service worker has `subscription` (or none). */
function stubBrowser(subscription: { endpoint: string; unsubscribe: () => Promise<boolean> } | null) {
  vi.stubGlobal("window", { PushManager: {}, Notification: {} })
  vi.stubGlobal("navigator", {
    serviceWorker: {
      getRegistration: async () => ({ pushManager: { getSubscription: async () => subscription } }),
    },
  })
}

function subscription() {
  return { endpoint: "https://fcm.googleapis.com/fcm/send/abc", unsubscribe: vi.fn(async () => true) }
}

describe("forgetPushSubscription", () => {
  beforeEach(() => {
    vi.mocked(deletePushSubscriptionRequest).mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("unsubscribes the browser without asking chatty-chat, which needs a token", async () => {
    const current = subscription()
    stubBrowser(current)

    await forgetPushSubscription()

    expect(current.unsubscribe).toHaveBeenCalledOnce()
    expect(deletePushSubscriptionRequest).not.toHaveBeenCalled()
  })

  it("does nothing when the browser has no subscription", async () => {
    stubBrowser(null)

    await expect(forgetPushSubscription()).resolves.toBeUndefined()
  })

  it("does nothing in a browser without push", async () => {
    vi.stubGlobal("window", {})
    vi.stubGlobal("navigator", {})

    await expect(forgetPushSubscription()).resolves.toBeUndefined()
  })
})

describe("disablePush", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("still deletes the row on the server first, then unsubscribes", async () => {
    const current = subscription()
    stubBrowser(current)

    await disablePush()

    expect(deletePushSubscriptionRequest).toHaveBeenCalledWith(current.endpoint)
    expect(current.unsubscribe).toHaveBeenCalledOnce()
  })
})
