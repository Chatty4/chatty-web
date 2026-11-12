// API base paths. By default the browser calls its own origin, and the Vite dev server or Nginx
// forwards the request (see vite.config.ts and nginx/), so no CORS is needed.
export const CORE_API_URL = import.meta.env.VITE_CORE_API_URL ?? "/api/core/v1"
export const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL ?? "/api/chat/v1"
// The public half of chatty-chat's VAPID key pair (D-13). Empty: push notifications are off.
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ""
