# API_SPEC — Mafia Wars

Socket.IO event contract, data models, and server state machine.
All payloads are validated with `zod` schemas defined in `shared/src/schemas.ts`.

Transport: Socket.IO 4.x, default namespace `/`, default room is the lobby code.

---

## 1. Data models

### 1.1 Enums

```ts
// shared/src/types.ts

export const ROLE = {
  MAFIA: 'mafia',
  DOCTOR: 'doctor',
  DETECTIVE: 'detective',
  CIVILIAN: 'civilian',
} as const;
export type Role = typeof ROLE[keyof typeof ROLE];

export const PHASE = {
  LOBBY: 'lobby',
  ROLE_REVEAL: 'role_reveal',
  NIGHT_MAFIA: 'night_mafia',
  NIGHT_DOCTOR: 'night_doctor',
  NIGHT_DETECTIVE: 'night_detective',
  DAWN: 'dawn',
  DISCUSSION: 'discussion',
  VOTING: 'voting',
  VOTE_TIEBREAK: 'vote_tiebreak',
  VOTE_RESULT: 'vote_result',
  ENDED: 'ended',
} as const;
export type Phase = typeof PHASE[keyof typeof PHASE];

export const WINNER = {
  MAFIA: 'mafia',
  CIVILIANS: 'civilians',
} as const;
export type Winner = typeof WINNER[keyof typeof WINNER];
```

### 1.2 Shared types

```ts
export interface PublicPlayer {
  id: string;         // server-generated nanoid, stable within a lobby
  name: string;       // user-chosen, 1-20 chars, trimmed
  isHost: boolean;
  alive: boolean;     // true until killed/voted out
  connected: boolean; // false during 60s disconnect grace
}

export interface Settings {
  mafiaCount: number;
  doctorEnabled: boolean;
  detectiveEnabled: boolean;
  discussionSeconds: number;
  votingSeconds: number;
  nightSeconds: number;
}

export interface LobbyPublicState {
  code: string;
  phase: Phase;
  settings: Settings;
  players: PublicPlayer[];
  round: number;                     // 0 while in lobby, 1+ during game
  phaseEndsAt: number | null;        // unix ms, or null if phase has no timer
  pinnedDawnMessage: string | null;  // from §3.4 of GAME_SPEC
  liveVotes?: Record<string, string | 'skip'>;  // voter.id → target.id/'skip', during VOTING or VOTE_TIEBREAK
  tiebreakCandidates?: string[];                // player ids on the tie-break ballot
  mafiaPicks?: Record<string, string>;          // (sent only to mafia) voter → target
}

// Role-specific view: what a given player receives
export interface SelfView {
  selfId: string;
  myRole: Role | null;        // null until role reveal
  myMafiaTeammates?: string[];// player ids (mafia only)
  canAct: boolean;            // true if this player is the actor for the current night sub-phase
  isSpectator: boolean;       // true if dead
}

export interface GameEndedPayload {
  winner: Winner;
  reason: 'all_mafia_eliminated' | 'mafia_parity';
  fullReveal: Array<{ id: string; name: string; role: Role; alive: boolean }>;
}

export interface DetectiveResultPayload {
  round: number;
  targetId: string;
  targetName: string;
  isMafia: boolean;
}
```

### 1.3 Server-only state (not sent to clients)

```ts
interface InternalLobbyState extends LobbyPublicState {
  players: InternalPlayer[];
  nightActions: {
    mafiaPicks: Map<string, string>;        // mafiaPlayerId -> targetId
    doctorSave: string | null;              // targetId
    detectiveInvestigate: string | null;    // targetId
  };
  votes: Map<string, string | 'skip'>;      // voterId -> targetId or 'skip'
  lastDoctorSelfSaveRound: number | null;   // round in which doctor last self-saved
  phaseTimerId: NodeJS.Timeout | null;
}
interface InternalPlayer extends PublicPlayer {
  role: Role | null;
  socketId: string | null;        // null while disconnected
  disconnectAt: number | null;    // unix ms if disconnected
}
```

---

## 2. Event catalog

All event names are string constants in `shared/src/events.ts`:

```ts
export const EV = {
  // Client → Server
  CREATE_LOBBY: 'c.createLobby',
  JOIN_LOBBY: 'c.joinLobby',
  LEAVE_LOBBY: 'c.leaveLobby',
  UPDATE_SETTINGS: 'c.updateSettings',
  START_GAME: 'c.startGame',
  NIGHT_MAFIA_PICK: 'c.night.mafiaPick',
  NIGHT_DOCTOR_PICK: 'c.night.doctorPick',
  NIGHT_DETECTIVE_INVESTIGATE: 'c.night.detectiveInvestigate',
  CHAT_SEND: 'c.chatSend',
  CAST_VOTE: 'c.castVote',
  RETURN_TO_LOBBY: 'c.returnToLobby',
  RECONNECT: 'c.reconnect',

  // Server → Client (broadcast or targeted)
  LOBBY_STATE: 's.lobbyState',           // full public state; sent after every change
  SELF_VIEW: 's.selfView',               // per-socket view (role, canAct, spectator)
  PHASE_CHANGED: 's.phaseChanged',       // small event + phaseEndsAt
  CHAT_MSG: 's.chatMsg',                 // append chat
  DAWN_ANNOUNCE: 's.dawnAnnounce',       // dawn text
  DETECTIVE_RESULT: 's.detectiveResult', // private to detective: investigation outcome
  VOTE_RESULT: 's.voteResult',           // splash payload
  GAME_ENDED: 's.gameEnded',             // winner reveal
  ERROR: 's.error',                      // { code, message }
  TOAST: 's.toast',                      // transient note (e.g., "Host disconnected")
} as const;
```

---

## 3. Client → Server events

Each entry: **when sent**, **payload (zod)**, **validation**, **server behaviour**, **errors**.

### 3.1 `c.createLobby`
- When: user clicks **Create Lobby** on HomePage.
- Payload: `{ name: string }`
- Validation: `name` trim 1–20 chars, alphanumeric + space + `_` `-` `.`.
- Server: generate code (§TECH_SPEC §LobbyManager), create lobby, mark socket as host, join socket to room `code`.
- Ack: `{ code: string, playerId: string }`.
- Errors: `NAME_INVALID`, `LOBBY_FULL_CAPACITY` (unlikely in v1).

### 3.2 `c.joinLobby`
- When: user clicks **Join** on HomePage.
- Payload: `{ name: string, code: string }`
- Validation: name as above; code 6 chars after uppercasing.
- Server:
  - Code lookup → `LOBBY_NOT_FOUND` if missing.
  - If phase != `LOBBY` → `LOBBY_IN_PROGRESS`.
  - If `players.length >= MAX_PLAYERS` → `LOBBY_FULL`.
  - If name is already taken in that lobby (case-insensitive) → `NAME_TAKEN`.
  - Add player, join room, broadcast `s.lobbyState`.
- Ack: `{ playerId: string }`.

### 3.3 `c.leaveLobby`
- When: user clicks **Leave** in lobby (pre-game) or closes tab (socket disconnect handler).
- Payload: `{}`
- Server:
  - If phase == `LOBBY` → remove player entirely, broadcast state.
  - If mid-game → mark `connected = false`, start 60s grace timer (see §4 Reconnect).

### 3.4 `c.updateSettings`
- When: host adjusts a setting.
- Payload: `Partial<Settings>` (any subset).
- Server:
  - Host-only (else `NOT_HOST`).
  - Validate ranges (see GAME_SPEC §2.3). Clamp if `mafiaCount` exceeds `floor(players/3)`.
  - Broadcast new `s.lobbyState`.

### 3.5 `c.startGame`
- When: host clicks **Start Game**.
- Payload: `{}`
- Server:
  - Host-only, phase == `LOBBY`.
  - `players.length >= MIN_PLAYERS` (else `NOT_ENOUGH_PLAYERS`).
  - `mafiaCount` fits (else `INVALID_SETTINGS`).
  - Assign roles (random shuffle, see GAME_SPEC §1.2).
  - Transition to `ROLE_REVEAL` for 5s, then `NIGHT_MAFIA`.
  - Emit `s.selfView` to every socket with their role, and `s.lobbyState` + `s.phaseChanged`.

### 3.6 `c.night.mafiaPick`
- When: a mafia player taps a target.
- Payload: `{ targetId: string }`
- Server:
  - Phase must be `NIGHT_MAFIA`; sender must be alive mafia.
  - Target must be alive and non-mafia.
  - Record pick in `nightActions.mafiaPicks`. Broadcast updated `liveVotes` to **mafia only**.
  - If all living mafia picked the **same** target, end sub-phase early → advance to `NIGHT_DOCTOR`.
- Errors: `NOT_YOUR_TURN`, `INVALID_TARGET`.

### 3.7 `c.night.doctorPick`
- When: doctor taps target.
- Payload: `{ targetId: string }`
- Server:
  - Phase == `NIGHT_DOCTOR`, sender is alive doctor.
  - Target is alive.
  - **Self-save constraint:** If `targetId === senderId` **and** `lastDoctorSelfSaveRound === currentRound - 1` → reject with `SELF_SAVE_LOCKED`.
  - Save pick. If doctor self-saved, update `lastDoctorSelfSaveRound = currentRound`.
  - Advance to `NIGHT_DETECTIVE`.
- Errors: `NOT_YOUR_TURN`, `INVALID_TARGET`, `SELF_SAVE_LOCKED`.

### 3.8 `c.night.detectiveInvestigate`
- When: detective taps target.
- Payload: `{ targetId: string }`
- Server:
  - Phase == `NIGHT_DETECTIVE`, sender is alive detective.
  - Target is alive and is not the detective themselves (self-target → `INVALID_TARGET`).
  - Store pick → run night resolution → transition to `DAWN`.
  - At dawn, if detective is still alive, server emits `s.detectiveResult` **only to the
    detective's socket** with `{ round, targetId, targetName, isMafia }`.
  - If detective died this night, nothing is sent (result lost per `GAME_SPEC` §3.3).

### 3.9 `c.chatSend`
- When: a living player sends chat during `DISCUSSION`.
- Payload: `{ text: string }`  — 1–280 chars, trimmed, no newlines.
- Server:
  - Phase must be `DISCUSSION`. (During `VOTING` / `VOTE_TIEBREAK` chat is disabled → reject with `PHASE_MISMATCH`.)
  - Sender must be alive.
  - Broadcast `s.chatMsg` to everyone in room (spectators receive too, but spec forbids them from sending).

### 3.10 `c.castVote`
- When: living player taps a vote target during `VOTING` or `VOTE_TIEBREAK`.
- Payload: `{ targetId: string | 'skip' }`
- Server:
  - Phase must be `VOTING` or `VOTE_TIEBREAK`, sender alive.
  - Target must be alive and **not equal to sender id** (no self-vote → `INVALID_TARGET`).
  - During `VOTE_TIEBREAK`: target must be in `tiebreakCandidates`, and `'skip'` is **not**
    allowed → `INVALID_TARGET`.
  - Record `votes[voterId] = targetId`. Broadcast updated `liveVotes` to everyone.
  - If every living player has voted → end phase early → resolve.
  - Resolution logic:
    - `VOTING` end → compute plurality. If tied among 2+ non-Skip players → transition to
      `VOTE_TIEBREAK` with those `tiebreakCandidates` (20s timer, votes cleared).
    - `VOTE_TIEBREAK` end → compute plurality. If still tied → no elimination.
    - Then → `VOTE_RESULT` (5s splash).

### 3.11 `c.returnToLobby`
- When: host clicks **Back to lobby** on end-game screen.
- Payload: `{}`
- Server:
  - Host-only, phase == `ENDED`.
  - Reset per-game state, keep players + settings, transition to `LOBBY`.
  - Mark disconnected players as fully removed.

### 3.12 `c.reconnect`
- When: client has a stored `(playerId, code)` and reconnects after a drop.
- Payload: `{ playerId: string, code: string }`
- Server:
  - Lookup lobby + player.
  - If within 60s grace or phase == LOBBY → re-attach `socketId`, set `connected = true`, join room.
  - Send `s.lobbyState` + `s.selfView` + current phase info.
  - Else → `RECONNECT_EXPIRED`.

---

## 4. Server → Client events

### 4.1 `s.lobbyState`
- Full `LobbyPublicState`. Sent to the whole room after any state change.
- Spectators and living players receive the same payload. Role-sensitive fields (`mafiaPicks`)
  are omitted and sent separately to mafia only.

### 4.2 `s.selfView`
- Targeted at a single socket. Payload: `SelfView` (§1.2).
- Sent on: initial join, every phase transition, death, reconnect.

### 4.3 `s.phaseChanged`
- Payload: `{ phase: Phase, phaseEndsAt: number | null, round: number }`
- Fires whenever the phase changes. Clients use this to drive countdowns and screens.

### 4.4 `s.chatMsg`
- Payload: `{ from: { id: string, name: string }, text: string, at: number }`
- Appended to chat history client-side.

### 4.5 `s.dawnAnnounce`
- Payload: `{ text: string, deadPlayerId: string | null, round: number }`
- Fired at `DAWN` phase start. Pinned on client chat for the round.

### 4.5a `s.detectiveResult`
- Private, sent only to the detective's socket during `DAWN` **if the detective is still alive**.
- Payload: `DetectiveResultPayload` = `{ round, targetId, targetName, isMafia }`.
- Client stores an append-only investigation log the detective can review on their own
  screen for the rest of the game.

### 4.6 `s.voteResult`
- Payload: `{ eliminatedId: string | null, eliminatedRole: Role | null, mafiaRemaining: number, text: string }`
- Fired at `VOTE_RESULT` phase. Client shows splash for 5s.

### 4.7 `s.gameEnded`
- Payload: `GameEndedPayload` (§1.2).

### 4.8 `s.error`
- Payload: `{ code: string, message: string }`. Codes: see §3 per event. Client toast + log.

### 4.9 `s.toast`
- Payload: `{ text: string, level: 'info' | 'warn' }`. Transient notices (host left, player
  reconnected, etc.).

---

## 5. Server state machine

```
LOBBY
  └─ host: c.startGame → assign roles → ROLE_REVEAL
ROLE_REVEAL (5s timer)
  └─ timer end → NIGHT_MAFIA
NIGHT_MAFIA (nightSeconds timer)
  ├─ all mafia agree → cancel timer → NIGHT_DOCTOR
  └─ timer end → tally plurality → NIGHT_DOCTOR
NIGHT_DOCTOR (nightSeconds timer, skipped if no doctor alive)
  ├─ doctor picks → cancel timer → NIGHT_DETECTIVE
  └─ timer end → no save → NIGHT_DETECTIVE
NIGHT_DETECTIVE (nightSeconds timer, skipped if no detective alive)
  ├─ detective picks → cancel timer → resolve night → DAWN
  └─ timer end → no investigate → resolve night → DAWN
DAWN (5s timer)
  ├─ emit public dawn announcement to everyone
  ├─ emit private s.detectiveResult to detective (if alive & investigated)
  ├─ check win conditions → ENDED or
  └─ timer end → DISCUSSION
DISCUSSION (discussionSeconds timer)
  └─ timer end → VOTING
VOTING (votingSeconds timer)
  ├─ all living players voted → cancel timer → resolve
  └─ timer end → resolve
    ├─ exactly-one-plurality OR Skip wins → VOTE_RESULT
    └─ tie among 2+ non-Skip → VOTE_TIEBREAK
VOTE_TIEBREAK (20s timer)
  ├─ all living players voted → cancel timer → resolve → VOTE_RESULT
  └─ timer end → resolve (tie allowed, no elim) → VOTE_RESULT
VOTE_RESULT (5s timer)
  ├─ check win conditions → ENDED or
  └─ timer end → round++ → NIGHT_MAFIA
ENDED
  └─ host: c.returnToLobby → reset per-game → LOBBY
```

All timers are server-authoritative. `phaseEndsAt` is sent to clients for display only;
clients never trust their own clock for phase transitions.

---

## 6. Role-filtered broadcasts

Three audiences the server uses:

| Audience | How |
|---|---|
| Everyone in lobby | `io.to(code).emit(...)` |
| Mafia only | Private room `code:mafia` — join on role assign, leave on death |
| One socket | `socket.emit(...)` |

Mafia-only data sent to `code:mafia`:
- Teammates list (on role reveal)
- Live mafia picks during `NIGHT_MAFIA`

Everything else is public (post-phase).

---

## 7. Error codes (complete list)

```
NAME_INVALID
NAME_TAKEN
LOBBY_NOT_FOUND
LOBBY_IN_PROGRESS
LOBBY_FULL
NOT_HOST
NOT_ENOUGH_PLAYERS
INVALID_SETTINGS
NOT_YOUR_TURN
INVALID_TARGET
SELF_SAVE_LOCKED
PHASE_MISMATCH
RECONNECT_EXPIRED
RATE_LIMITED
INTERNAL_ERROR
```

Client renders a toast with `message` for all. `INTERNAL_ERROR` also logs to console.

---

## 8. Rate limits (minimal)

Per-socket, per-event, server-side token bucket:
- `c.chatSend`: 1 message / 500ms, burst 5.
- All other events: 10 / second.
- Exceeding → `RATE_LIMITED` error, no state change.
