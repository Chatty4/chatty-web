import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  // Only used by the dev server, never sent to the browser (no VITE_ prefix).
  const env = loadEnv(mode, process.cwd(), "")
  const coreTarget = env.CORE_API_TARGET || "http://127.0.0.1:8000"
  const chatTarget = env.CHAT_API_TARGET || "http://127.0.0.1:8001"

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      // Same paths as Nginx in the Docker image: the browser only talks to this origin, so no CORS.
      proxy: {
        "/api/core": { target: coreTarget, changeOrigin: true },
        "/api/chat": { target: chatTarget, changeOrigin: true, ws: true },
        "/health/core": {
          target: coreTarget,
          changeOrigin: true,
          rewrite: () => "/health",
        },
        "/health/chat": {
          target: chatTarget,
          changeOrigin: true,
          rewrite: () => "/health",
        },
      },
    },
  }
})
