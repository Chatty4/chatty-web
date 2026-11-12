interface ImportMetaEnv {
  readonly VITE_CORE_API_URL?: string
  readonly VITE_CHAT_API_URL?: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
