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

Open http://localhost:5173. You can register, log in and log out; the screens after login are placeholders
for now. Logging in needs chatty-core running. `/status` calls each backend's `/health` through the proxy,
to check that the wiring works.

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

## Login and tokens

chatty-core's login returns an access token (a JWT, 15 minutes) and a refresh token (30 days, rotated on every
refresh); see `chatty-infra/docs/api-core.md`, Authorization. `src/lib/session.ts` keeps them:

- Both tokens are in `localStorage`, shared by the tabs. A reload or a new tab reuses the access token
  instead of refreshing.
- The refresh token is only read and rotated inside a Web Lock, so two tabs never send the same one (that
  would count as theft and log out every device). A tab that waited uses the token the other tab stored.
- The access token is refreshed about a minute before it expires. A request that still gets
  `401 unauthorized` refreshes once and is repeated (`src/lib/api.ts`).
- Logging in or out in one tab does the same in the others (`BroadcastChannel`).
- A rejected refresh token (`401`) or a deactivated user (`403`) ends the session everywhere. When
  chatty-core can't be reached, the session is kept and the app offers to try again.

## Project layout

Each feature keeps its API calls, state and components together; pages only put features together.

```
src/
  main.tsx              entry point: theme, AuthProvider, RouterProvider
  app/
    routes.tsx          all routes
    layouts/            AuthLayout, AppLayout (the shell), RequireAuth, GuestOnly
    pages/              one thin component per screen
  components/
    ui/                 generic components (Button, Input, FormField, ...; shadcn ones too)
    app/                the app shell: team rail, sidebar, header, user menu, ...
  features/<name>/      one folder per feature (auth for now)
    fetchers/           API calls
    hooks/              state and logic
    ui/                 the feature's components
    utils/              pure helpers (validation, error messages, ...)
    types.ts            the feature's types (from the contracts)
    index.ts            what other code may import
  hooks/                shared hooks (useTheme)
  lib/
    api.ts              API client: Authorization header, refresh on 401, contract error body -> ApiError
    session.ts          the tokens: storage, refresh, other tabs
    theme.ts            light and dark theme
    utils.ts            cn() helper
nginx/                  Nginx config for the Docker image
```

Other code imports a feature only through its `index.ts`.

## Contributing

One Jira ticket per branch and PR (`CHAT-<n>/<short-name>`), and `npm run lint`, `npm run typecheck` and
`npm run build` must pass before you push.
