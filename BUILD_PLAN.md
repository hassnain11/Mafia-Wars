# BUILD_PLAN — Mafia Wars

Phased, ordered plan Claude Code should follow to go from empty repo to a playable game.
Each phase has a **goal**, concrete **tasks**, and a **"done when"** check.

Rules of engagement for whoever executes this:
- Do phases strictly in order. Do not skip ahead.
- Before each phase, re-read the relevant spec files cited.
- After each phase, run the "done when" check manually before moving on.
- If a spec is ambiguous, consult `OPEN_QUESTIONS.md` first; if still unclear, pause and ask.

---

## Phase 0 — Repo + tooling

**Goal:** scaffold the monorepo with workspaces, TypeScript, lint, and gitignore. No code logic yet.

**Tasks:**
1. `git init`
2. Root `package.json` with npm workspaces: `["shared", "server", "client"]`.
3. Root `tsconfig.base.json` with strict mode, `moduleResolution: bundler`.
4. Root `.gitignore`: `node_modules`, `dist`, `.env`, `.DS_Store`, `*.log`.
5. Root `.editorconfig` + Prettier config (`.prettierrc` with 100-char line width).
6. Install dev deps at root: `typescript`, `prettier`, `tsx`, `@types/node`.
7. Create empty workspace folders with their own `package.json` and `tsconfig.json` extending the base.

**Done when:**
- `npm install` at root installs all three workspaces with no errors.
- `tsc --noEmit` from each workspace runs clean (no files yet is fine).

---

## Phase 1 — `shared/` package

**Goal:** All shared types, event names, zod schemas, and constants in one place.

**References:** `API_SPEC.md` §1, §2.

**Tasks:**
1. `shared/src/constants.ts` — `MIN_PLAYERS = 5`, `MAX_PLAYERS = 12`, default `Settings`, timer defaults.
2. `shared/src/types.ts` — `ROLE`, `PHASE`, `WINNER` enums; `PublicPlayer`, `Settings`, `LobbyPublicState`, `SelfView`, `GameEndedPayload`.
3. `shared/src/events.ts` — `EV` object with every event name string.
4. `shared/src/schemas.ts` — one zod schema per client-sent event (per `API_SPEC.md` §3).
5. `shared/src/index.ts` — re-export everything.

**Done when:**
- `tsc --noEmit` in `shared/` is clean.
- Server/client can `import { EV, ROLE, LobbyPublicState } from '../../shared/src'`.

---

## Phase 2 — Server boot + healthz

**Goal:** Fastify + Socket.IO server starts, serves `/healthz`, accepts WS connections.

**References:** `TECH_SPEC.md` §1.1, §3.2.

**Tasks:**
1. `server/src/util/logger.ts` — pino instance, pretty in dev.
2. `server/src/index.ts` — Fastify app on `PORT`, CORS allowlist from `CLIENT_ORIGIN`, Socket.IO attached, `GET /healthz` → `{ ok: true }`.
3. On socket connect: log `socketId`. On disconnect: log reason.
4. `server/Dockerfile` (Node 20 slim, multi-stage).
5. `server/package.json` scripts: `dev` (tsx watch), `build` (tsc), `start` (node dist/index.js).

**Done when:**
- `npm run dev --workspace=server` boots on `localhost:8080`.
- `curl localhost:8080/healthz` → 200.
- A WebSocket client can connect and the log shows "socket connected".

---

## Phase 3 — Lobby lifecycle (no game yet)

**Goal:** Create / join / leave / update-settings / start work end-to-end. No roles, no rounds.

**References:** `GAME_SPEC.md` §2, `API_SPEC.md` §3.1–3.5, §4.1.

**Tasks:**
1. `server/src/lobby/codeGen.ts` — generate unambiguous 6-char code, collision-check.
2. `server/src/lobby/Lobby.ts` — class holding `LobbyPublicState` + internal fields.
3. `server/src/lobby/LobbyManager.ts` — `Map<code, Lobby>` registry; `create`, `get`, `remove`.
4. `server/src/socket/handlers.ts` — wire `c.createLobby`, `c.joinLobby`, `c.leaveLobby`, `c.updateSettings`.
5. On any state change, emit `s.lobbyState` to the room.
6. Validate every payload with zod from `shared/src/schemas`. On validation failure, emit `s.error { code: 'NAME_INVALID' | ... }`.
7. Implement host-transfer on disconnect while in LOBBY phase.
8. `c.startGame` → for now just transitions phase to `ROLE_REVEAL` and back to `LOBBY` after 1s (we'll flesh out in Phase 5).

**Done when:**
- Two WebSocket clients (test with a small Node script) can create + join a lobby.
- Host sees settings; non-host sees state-only.
- Leaving removes the player; host leaves → next player becomes host.

---

## Phase 4 — Client shell + lobby UI

**Goal:** HomePage + LobbyPage are fully functional in the browser.

**References:** `UI_SPEC.md` §1–§2, `TECH_SPEC.md` §1.2.

**Tasks:**
1. Vite + React + TS + Tailwind scaffold in `client/`.
2. `client/src/socket.ts` — singleton `io(VITE_SERVER_URL, { autoConnect: false })`, exposes `connect(opts)` + typed `emit`/`on` helpers using `EV` constants.
3. `client/src/store/gameStore.ts` — Zustand store holding `LobbyPublicState | null`, `SelfView | null`, `chat[]`, connection status.
4. `client/src/router.tsx` — routes `/` and `/lobby/:code`. If no lobby state and route is `/lobby/*`, redirect to `/`.
5. `client/src/pages/HomePage.tsx` — name + create/join UI, wires to socket emits with ack handlers.
6. `client/src/pages/LobbyPage.tsx` — renders player list, settings panel (host-editable), start button.
7. Persist `playerId` + `code` to `sessionStorage` so a refresh can reconnect (used in Phase 7).

**Done when:**
- Open the site in two browser tabs, create a lobby in one, join from the other with the code.
- Host adjusts settings → non-host sees them update live.
- Start Game button becomes enabled at 5 players; clicking it transitions both tabs to "role reveal" placeholder.

---

## Phase 5 — Game engine (server)

**Goal:** Server runs a full round: role assign, night sub-phases, dawn, discussion, voting, splash, win check.

**References:** `GAME_SPEC.md` §3–§4, `API_SPEC.md` §3.5–§3.10, §4.3–§4.7, §5.

**Tasks:**
1. `server/src/game/roles.ts` — role shuffler respecting `settings.mafiaCount`, doctor/detective flags.
2. `server/src/util/timer.ts` — cancelable timer utility (`setPhaseTimer(lobby, ms, onEnd)`).
3. `server/src/game/winConditions.ts` — pure function `(lobby) => Winner | null`.
4. `server/src/game/GameEngine.ts` — single `advancePhase(lobby)` method implementing the state machine in `API_SPEC.md` §5. Called on timer end OR on early condition (all mafia agree, all votes in, etc.).
5. On entering each phase: compute `phaseEndsAt`, emit `s.phaseChanged`, emit per-player `s.selfView`, broadcast `s.lobbyState`.
6. Handlers for `c.night.mafiaPick`, `c.night.doctorPick`, `c.night.detectivePick` recording picks and (for mafia) checking early-exit condition.
7. `c.chatSend` for DISCUSSION only (and VOTING per Open Qs decision).
8. `c.castVote` with live tally broadcast and all-voted early-exit.
9. Dawn resolution logic exactly per `GAME_SPEC.md` §3.4.
10. End-game: emit `s.gameEnded` with full reveal.
11. `c.returnToLobby` resets per-game fields and loops to `LOBBY`.

**Done when:**
- A scripted multi-client test (5 bots) can play a full game: mafia kills, doctor saves or doesn't, detective guesses, discussion (bots just wait), voting, splash, next round, until a winner is declared.
- Server logs show correct phase transitions and timers never leak after a game ends.

---

## Phase 6 — Game UI (client)

**Goal:** All in-game screens render per `UI_SPEC.md` and respond to server events.

**References:** `UI_SPEC.md` §3.

**Tasks:**
1. `client/src/components/Countdown.tsx` driven by `phaseEndsAt`.
2. `client/src/pages/GamePage.tsx` — switches sub-component by `state.phase`.
3. Sub-components: `RoleRevealScreen`, `NightMafiaScreen`, `NightDoctorScreen`, `NightDetectiveScreen`, `DawnScreen` (with private detective-result card), `DiscussionScreen`, `VotingScreen`, `VoteTiebreakScreen`, `VoteResultScreen`, `EndGameScreen`.
4. `ChatBox` component with scroll-to-bottom-on-new-msg.
5. Spectator banner + input lockout.
6. Toast system for `s.error`, `s.toast`.
7. Connection indicator in header.

**Done when:**
- Full game is playable across 5+ real browsers.
- All splashes match spec exactly.
- Chat input is disabled for spectators; vote buttons disabled after death.

---

## Phase 7 — Reconnect + hardening

**Goal:** Players surviving a page refresh / brief network drop; basic rate limits; graceful error paths.

**References:** `GAME_SPEC.md` §6, `API_SPEC.md` §3.12, §8.

**Tasks:**
1. Client: on load, if `sessionStorage` has `(playerId, code)`, emit `c.reconnect` and route to `/lobby/:code`.
2. Server: 60s grace timer per disconnected player; on reconnect, rebind `socketId`, rejoin rooms, resend state.
3. Server: token-bucket rate limiter per socket per event.
4. Server: when a disconnected mafia/doctor/detective's sub-phase would start, time out immediately.
5. Server: catch-all `s.error { code: 'INTERNAL_ERROR' }` on handler throws; stack trace to pino.

**Done when:**
- Mid-game browser refresh restores the player to their role and current phase within 2s.
- Flooding chat triggers rate-limit error toast without disconnecting the socket.

---

## Phase 8 — Deploy

**Goal:** The game is live on the public internet, zero budget.

**References:** `TECH_SPEC.md` §3.

**Tasks:**
1. Push repo to GitHub (or GitLab).
2. Connect Cloudflare Pages → build command `npm run build --workspace=client` → output `client/dist`. Set `VITE_SERVER_URL` env var.
3. Fly.io: `flyctl launch` with `server/Dockerfile`, pick region near users, allocate 1 shared-cpu-1x VM.
4. Set server env: `CLIENT_ORIGIN=https://<pages-url>`, `PORT=8080`, `LOG_LEVEL=info`.
5. Add `/healthz` to Fly check config.
6. Smoke test: open the Pages URL from two devices on cellular; play a 2-minute game.

**Done when:**
- Public URL works from any device.
- Server logs show at least one full game end-to-end from external players.

---

## Phase 9 — Polish (optional, pick off as time allows)

- Sound effects (role reveal ding, dawn gong, vote splash).
- Smooth phase transitions (fade / slide).
- Mobile haptic on your turn ("your pick" vibration).
- Dark/light theme toggle (dark is default).
- Localization scaffold for Urdu/Roman Urdu strings (`shared/src/i18n.ts`).
- Anti-abuse: 1 word profanity filter in chat.

---

## Deliverables checklist

- [ ] Repo on GitHub with clean history.
- [ ] All 10 spec files present and up to date.
- [ ] Server deployed on Fly.io; client on Cloudflare Pages.
- [ ] A 5-player game playable from the public URL start to finish.
- [ ] README has a short "How to play" and a link to the live URL.
