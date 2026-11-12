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

// Take over the tabs that are already open, so a click can navigate them (only works for tabs
// this worker controls).
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

// Open the channel: in a Chatty tab that is already open, or in a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const { team_id: teamId, channel_id: channelId } = event.notification.data ?? {}
  const url = teamId && channelId ? `/teams/${teamId}/channels/${channelId}` : "/"
  event.waitUntil(
    (async () => {
      const [tab] = await self.clients.matchAll({ type: "window" })
      if (!tab) return self.clients.openWindow(url)
      await tab.focus()
      return tab.navigate(url)
    })(),
  )
})
