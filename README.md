# chatty-web

React web app for Chatty, the team chat for channels, DMs and live messages.

- Talks to chatty-core (`/api/core/v1`, contract: `chatty-infra/docs/api-core.md`) and chatty-chat
  (`/api/chat/v1` and the WebSocket, contract: `chatty-infra/docs/api-chat.md`)
- The browser only talks to its own origin: in development the Vite dev server forwards the API paths, in Docker
  Nginx does. No CORS needed.

Stack: Vite, React 19, TypeScript, React Router, Tailwind CSS 4, shadcn/ui (Base UI), ESLint, Vitest.

## Requirements

- Node.js 24 (npm 11), the same as the Docker image and CI
- chatty-core and chatty-chat, from `chatty-infra`. Without them only the login page and `/status` work
- Internet access for the emoji picker: it loads its emoji data from jsDelivr (`cdn.jsdelivr.net`)

## Setup

```bash
npm install
cp .env.example .env    # optional: the defaults point at 127.0.0.1:8000 (core) and 127.0.0.1:8001 (chat)
```

## Run

```bash
npm run dev
```

Open http://localhost:5173. You can register, log in, create and join teams, use channels and DMs, and send,
edit and delete messages, with reactions, pins, unread badges, presence dots and a typing indicator. A public
channel you open without joining updates live too. Logging in needs chatty-core running, and messages need
chatty-chat. `/status` calls each backend's `/health` through the proxy, to check that the wiring works.

Not built yet: file uploads.

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
npm test            # Vitest, once
npm run test:watch  # Vitest, on every change
```

Tests sit next to the code as `*.test.ts`. They cover the logic without a browser: the message, unread,
presence and typing stores, reconnect helpers, permissions, when to reload the sidebar or watch a channel,
and other pure functions.

CI (`.github/workflows/ci.yml`) runs `npm ci`, `lint`, `typecheck`, `test` and `build` on Node 24, on every pull
request and on pushes to `dev` and `main`.

## Docker

```bash
docker build -t chatty-web .
docker run --rm -p 8080:80 --network chatty_default chatty-web
```

Open http://localhost:8080. Nginx serves the built app and forwards the API paths to `http://core:8000` and
`http://chat:8001` on the infra network. Override them with `-e CORE_API_UPSTREAM=...` and
`-e CHAT_API_UPSTREAM=...`. Nginx starts even if a backend isn't running; its paths then return 502.

The config is `nginx/default.conf.template`:

- **Security headers on every response:** `X-Content-Type-Options`, `Referrer-Policy` and
  `Content-Security-Policy`. A location with its own `add_header` drops the server-level ones, so `/assets/`
  and `/` repeat them: change all three copies together.
- **The CSP** is in `$csp`: only our own scripts, styles (inline too) and images, `connect-src` for the API, the
  WebSocket and jsDelivr (the emoji data), and no framing. Adding a script, font or API from another origin
  means adding it there.
- **The access log** writes the path without the query string, because the WebSocket sends the access token
  as `?token=`.

Check the headers with `curl -I http://localhost:8080/`.

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
- Every login gets a session id. A tab whose login was replaced by another one, maybe another user's, reloads
  instead of using the new token with the old user's data (`src/lib/session-sync.ts`).
- A rejected refresh token (`401`) or a deactivated user (`403`) ends the session everywhere. When
  chatty-core can't be reached, the session is kept and the app offers to try again.

## Live updates

The app shell opens one WebSocket per tab (`src/features/ws/ws-provider.tsx`), with the access token in the URL:

- A heartbeat goes out every 20 s, and when the tab is shown or hidden.
- A closed socket reconnects with backoff. Close code `4003` (deactivated user) logs out.
- About a minute before the token expires, a new socket opens with a fresh token, and the old one closes only
  once the new one is open, so others don't see you go offline and online. If the new one fails, the old one
  carries on.
- After every open, `POST /sync` fetches what was missed. Live messages wait until it answers
  (`src/lib/ws/sync-gate.ts`).
- A public channel you open without joining is followed with `watch`, sent again after every reconnect, and
  ended with `unwatch` when you leave it (`src/features/messages/hooks/use-watch-channel.ts`).
- No message says you were added to a channel or sent a new DM. The sidebar reloads after every reconnect, and
  when an event or unread count arrives for a channel it doesn't list, at most once a minute per channel
  (`src/features/channels/utils/unknown-channels.ts`).

The message store (`src/features/messages/`) keeps one state per loaded channel and applies events by `seq`, as
`chatty-infra/docs/events.md` says: it drops duplicates, applies the next event and fills gaps. Writes always go
through REST. A message shows as pending at once, then as sent or failed; a retry reuses its `client_msg_id`.

More: the `chatty-docs` repo, `services/web/index.md` and `architecture/flows/from-login-to-logout.md`.

## Push notifications

chatty-chat's push worker sends a Web Push for new messages while Chatty isn't on screen (D-13). Here
(`src/features/push/`, `public/sw.js`):

- **Setup:** set `VITE_VAPID_PUBLIC_KEY` in `.env` to `VAPID_PUBLIC_KEY` from `chatty-chat/.env` (made by
  chatty-infra's `setup.bat`). Without it the settings page says push isn't set up. For Docker, pass it with
  `--build-arg`. Push needs a secure origin: `localhost`, `127.0.0.1` or https.
- **Turning it on:** Account settings → Notifications asks for permission, registers `/sw.js`, subscribes with
  the key and saves the subscription (`POST /push/subscriptions`).
- **App start:** a browser that turned it on saves its subscription again, because browsers sometimes change
  it. A subscription made for another key is replaced.
- **Turning it off and logging out:** `DELETE /push/subscriptions` and unsubscribe, before chatty-core's
  logout, so the next person on this browser doesn't get pushes they didn't turn on.
- **The service worker** shows one notification per channel (a newer one replaces it). A click opens
  `/teams/{team_id}/channels/{channel_id}` in an open Chatty tab, or in a new one.

## Project layout

Each feature keeps its API calls, state and components together; pages only put features together.

```
src/
  main.tsx              entry point: theme, AuthProvider, RouterProvider
  app/
    routes.tsx          all routes
    layouts/            AuthLayout, AppLayout (the shell and its providers), RequireAuth, GuestOnly
    pages/              one thin component per screen
  components/
    ui/                 generic components (Button, Input, FormField, ...; shadcn ones too)
    app/                the app shell: team rail, sidebar, header, user menu, ...
  features/<name>/      auth, channels, invites, messages, presence, profile, push, teams, typing, unread, ws
    fetchers/           API calls
    hooks/              state and logic
    store/              messages, presence, typing, unread: the pure state changes, tested without a browser
    ui/                 the feature's components
    utils/              pure helpers (validation, error messages, ...)
    types.ts            the feature's types (from the contracts)
    index.ts            what other code may import
  hooks/                shared hooks (useTheme, useConfirm, useTabVisible)
  lib/
    api.ts              API client: Authorization header, refresh on 401, contract error body -> ApiError
    api-error.ts        ApiError and how a response becomes one
    config.ts           API base paths, VAPID public key
    session.ts          the tokens: storage, refresh, other tabs
    session-sync.ts     whether a token another tab shares belongs to this tab's login
    theme.ts            light and dark theme
    toast.ts            toast messages
    utils.ts            cn() helper
    uuid.ts, chunk.ts, fetch-all-pages.ts   small helpers (UUIDs over plain http, batching, paging)
    ws/                 one WebSocket connection, reconnect delays, the sync gate, message types
nginx/                  Nginx config for the Docker image
```

Other code should import a feature through its `index.ts`. A few imports still reach inside a feature, and
`invites` has no `index.ts` yet.

## Contributing

One Jira ticket per branch and PR (`CHAT-<n>/<short-name>`), and `npm run lint`, `npm run typecheck`,
`npm test` and `npm run build` must pass before you push; CI runs the same.
