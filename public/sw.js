// Service worker for Web Push (CHAT-219). Plain JS in public/, so it is served as /sw.js and its
// scope is the whole app. The payload is chatty-chat's push payload (api-chat.md#push-payload).

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    // not our payload: still show something, browsers penalize a push without a notification
  }
  event.waitUntil(
    self.registration.showNotification(data.mentioned ? "You were mentioned" : "New message", {
      body: data.preview || "Open Chatty to read it.",
      icon: "/favicon.svg",
      // One notification per channel: a newer message replaces the older one.
      tag: data.channel_id,
      renotify: Boolean(data.channel_id),
      data,
    }),
  )
})

// Focus an open Chatty tab, or open one.
// shortcut: the payload has no team_id, so this can't open the channel itself; add team_id to the
// payload when deep links are wanted.
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((tabs) => {
      const tab = tabs.find((client) => new URL(client.url).origin === self.location.origin)
      return tab ? tab.focus() : self.clients.openWindow("/")
    }),
  )
})
