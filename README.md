# chatty-web

React web app for Chatty, the team chat for channels, DMs and live messages.

- Talks to chatty-core (`/api/core/v1`, contract: `chatty-infra/docs/api-core.md`) and chatty-chat
  (`/api/chat/v1` and the WebSocket, contract: `chatty-infra/docs/api-chat.md`)
- The browser only talks to its own origin: in development the Vite dev server forwards the API paths, in Docker
  Nginx does. No CORS needed.

Stack: Vite, React 19, TypeScript, React Router, Tailwind CSS 4, shadcn/ui (Base UI), ESLint.

## Requirements

- Node.js 24 (npm 11)
- The backends you want to call, from `chatty-infra` (optional: the pages work without them)

## Setup

```bash
npm install
cp .env.example .env    # optional: the defaults point at 127.0.0.1:8000 (core) and 127.0.0.1:8001 (chat)
```

## Run

```bash
npm run dev
```

Open http://localhost:5173. The screens are placeholders for now. `/status` calls each backend's `/health`
through the proxy, to check that the wiring works.

| Path in the browser | Forwarded to |
|---|---|
| `/api/core/...` | chatty-core (`CORE_API_TARGET`, default `http://127.0.0.1:8000`) |
| `/api/chat/...` (also the WebSocket) | chatty-chat (`CHAT_API_TARGET`, default `http://127.0.0.1:8001`) |
| `/health/core`, `/health/chat` | the backend's `/health` |

## Commands

```bash
npm run dev         # dev server with hot reload
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run build       # typecheck + production build into dist/
npm run preview     # serve dist/ locally
```

## Docker

```bash
docker build -t chatty-web .
docker run --rm -p 8080:80 --network chatty_default chatty-web
```

Open http://localhost:8080. Nginx serves the built app and forwards the API paths to `http://core:8000` and
`http://chat:8001` on the infra network. Override them with `-e CORE_API_UPSTREAM=...` and
`-e CHAT_API_UPSTREAM=...`. Nginx starts even if a backend isn't running; its paths then return 502.

## Project layout

```
src/
  main.tsx          entry point, RouterProvider
  app/              router.tsx (all routes), AppLayout.tsx
  pages/            one component per screen (placeholders for now)
  components/       shared components
    ui/             shadcn components (added with npx shadcn@latest add <name>)
  lib/
    api.ts          API client: base URLs, Authorization header, contract error body -> ApiError
    utils.ts        cn() helper
nginx/              Nginx config for the Docker image
```

## Contributing

One Jira ticket per branch and PR (`CHAT-<n>/<short-name>`), and `npm run lint`, `npm run typecheck` and
`npm run build` must pass before you push.
