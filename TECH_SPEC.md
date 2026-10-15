# TECH_SPEC — Mafia Wars

Technology stack, folder structure, and deployment plan. Zero-budget constraint.

---

## 1. Stack

### 1.1 Server

| Layer | Choice | Why |
|---|---|---|
| Runtime | **Node.js 20 LTS** | Mature, same language as client, cheap hosting |
| Language | **TypeScript** | Type-safety for socket payloads and game state |
| Framework | **Fastify** | Fast, minimal, good TS story |
| Real-time | **socket.io 4.x** | Rooms, broadcast, reconnect handshake built in |
| State | **In-memory `Map`** | No DB in v1 — lobbies live only in RAM |
| Validation | **zod** | Validate every incoming socket payload |
| Logging | **pino** | Structured, cheap, pretty in dev |

No database. No Redis. A single Node process holds all lobbies in memory. If the server
restarts, all in-progress games end. This is acceptable for v1 — document it on the
end-game screen if a disconnect-storm happens.

### 1.2 Client

| Layer | Choice | Why |
|---|---|---|
| Framework | **React 18** | Standard, huge ecosystem |
| Language | **TypeScript** | Shared types with server |
| Build | **Vite** | Fast dev server, trivial static build |
| Router | **react-router-dom 6** | Lobby/game routing |
| State | **Zustand** | Simple global store for lobby + game state |
| Real-time client | **socket.io-client** | Matches server |
| Styling | **Tailwind CSS** | Fast UI, mobile-responsive by default |
| Icons | **lucide-react** | Lightweight, free |

No component library — Tailwind + a small hand-rolled component set. Keep bundle small.

### 1.3 Shared

A `shared/` package (plain TS files, no build) exports:
- Socket event names (string constants)
- Payload types (zod schemas + inferred TS types)
- Role enum, phase enum, game constants

Both client and server import from `shared/`. See `API_SPEC.md` for contents.

---

## 2. Folder structure

```
D:/Mafia wars/
├── README.md
├── GAME_SPEC.md
├── TECH_SPEC.md
├── API_SPEC.md
├── UI_SPEC.md
├── BUILD_PLAN.md
├── OPEN_QUESTIONS.md
├── package.json             # Root: npm workspaces for server/client/shared
├── tsconfig.base.json
├── .gitignore
├── .env.example
│
├── shared/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── events.ts         # Socket event name constants
│       ├── schemas.ts        # zod schemas for every payload
│       ├── types.ts          # Role, Phase, Player, Lobby, GameState
│       └── constants.ts      # MIN_PLAYERS, DEFAULT_TIMINGS, etc.
│
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts          # Fastify + socket.io boot
│       ├── lobby/
│       │   ├── LobbyManager.ts   # In-memory lobby registry
│       │   ├── Lobby.ts          # One lobby's state machine
│       │   └── codeGen.ts        # 6-char code generator
│       ├── game/
│       │   ├── GameEngine.ts     # Phase loop, timers, resolution
│       │   ├── roles.ts          # Role assignment
│       │   └── winConditions.ts  # Pure function: check who won
│       ├── socket/
│       │   ├── handlers.ts       # Register all handlers on connection
│       │   ├── auth.ts           # (v1) name+code only; no auth
│       │   └── broadcast.ts      # Per-role filtered broadcasts
│       └── util/
│           ├── logger.ts
│           └── timer.ts          # Cancelable server-side timers
│
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    ├── tailwind.config.ts
    ├── postcss.config.js
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── router.tsx
        ├── socket.ts             # Singleton socket.io-client instance
        ├── store/
        │   └── gameStore.ts      # Zustand store
        ├── pages/
        │   ├── HomePage.tsx       # Create / Join
        │   ├── LobbyPage.tsx      # Pre-game lobby
        │   └── GamePage.tsx       # In-game (phase-switched)
        ├── components/
        │   ├── PlayerList.tsx
        │   ├── Countdown.tsx
        │   ├── ChatBox.tsx
        │   ├── RoleSplash.tsx
        │   ├── VotePanel.tsx
        │   ├── NightAction.tsx    # Phase-specific action UI
        │   └── EndGameScreen.tsx
        └── styles.css              # Tailwind entry
```

---

## 3. Hosting (zero budget)

### 3.1 Client — static hosting

**Cloudflare Pages** (preferred) or **Vercel**.
- Both free, both deploy on `git push`.
- Build command: `npm run build --workspace=client`
- Output dir: `client/dist`
- Set env var `VITE_SERVER_URL` to the server's public URL.

### 3.2 Server — long-lived Node process

**Fly.io** free tier (preferred) or **Render** free tier.

Why Fly.io: 3 shared-cpu-1x VMs free, no forced sleep.
Why not Render free tier alone: it sleeps after 15 min idle, which breaks mid-game.

Deployment:
- Dockerfile at `server/Dockerfile` (Node 20 slim).
- `fly.toml` committed at repo root with health check on `GET /healthz`.
- Single region (closest to users, e.g., `fra` for Pakistan latency) in v1.
- Expose port 8080 inside, Fly maps 443 externally. Socket.io works over same port with
  WebSocket upgrade.

### 3.3 Local dev

- `npm run dev` at the root runs client (Vite on :5173) and server (ts-node-dev on :8080) concurrently.
- Vite proxies `/socket.io` to `localhost:8080` so the browser connects to Vite and WS is
  tunneled — avoids CORS during dev.

---

## 4. Config

| Env var | Where | Example | Notes |
|---|---|---|---|
| `PORT` | server | `8080` | HTTP + WS |
| `CLIENT_ORIGIN` | server | `https://mafiawars.pages.dev` | CORS allowlist |
| `LOG_LEVEL` | server | `info` | pino level |
| `VITE_SERVER_URL` | client | `https://mafiawars.fly.dev` | socket.io target |

No secrets in v1 (no auth, no DB). `.env.example` committed; real `.env` gitignored.

---

## 5. Dependencies — exact versions to pin

```
# server
fastify ^4.28.0
@fastify/cors ^9.0.0
socket.io ^4.7.5
zod ^3.23.0
pino ^9.0.0
pino-pretty ^11.0.0 (dev)

# client
react ^18.3.0
react-dom ^18.3.0
react-router-dom ^6.26.0
socket.io-client ^4.7.5
zustand ^4.5.0
tailwindcss ^3.4.0
lucide-react ^0.400.0

# shared
zod ^3.23.0

# dev (root / per workspace)
typescript ^5.5.0
tsx ^4.16.0
vite ^5.4.0
@types/node ^20
```

Lock these in `package.json` with caret ranges and commit the root `package-lock.json`.

---

## 6. Non-goals (v1)

- No database, no persistence across server restarts.
- No horizontal scaling — single Node process. If scale is ever needed, migrate to
  Redis adapter for socket.io and move lobby storage to Redis.
- No auth, no accounts, no profiles.
- No voice chat.
- No mobile app (web is responsive).
- No analytics beyond server logs.
- No internationalization (English-only UI in v1 — Roman Urdu/Urdu can be added later).
