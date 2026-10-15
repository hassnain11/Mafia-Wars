# GAME_SPEC — Mafia Wars

Complete rules, roles, flow, and win conditions. This is the source of truth for game logic.

---

## 1. Players and roles

### 1.1 Player counts

| Setting | Value |
|---|---|
| Minimum players | **5** (ensures at least 1 mafia + 1 civilian + room for optional roles) |
| Maximum players | **12** (v1 cap — can be raised later) |
| Spectators | A dead player automatically becomes a spectator; no join-as-spectator in v1 |

### 1.2 Roles

| Role | Count | Night ability | Day ability |
|---|---|---|---|
| **Mafia** | Host-configurable, `1 ≤ mafiaCount ≤ floor(players / 3)` | Together pick one player to kill | Vote during day phase |
| **Doctor** | 0 or 1 (host toggles) | Pick one player to save (self-save allowed? see Open Qs) | Vote during day phase |
| **Detective** | 0 or 1 (host toggles) | Privately investigate one player — learn whether they are Mafia or not | Vote during day phase |
| **Civilian** | Fills all remaining slots | None | Vote during day phase |

**Role assignment:** On game start, the server shuffles players and assigns Mafia first, then
Doctor (if enabled), then Detective (if enabled), then Civilians. All role assignments are
secret except for Mafia — mafia players see who the other mafia are.

### 1.3 Role reveal screen

Immediately after the host presses **Start**, every player sees a full-screen "Your role is X"
splash for **5 seconds** before the first night begins. Mafia see the names of other mafia
on their splash.

---

## 2. Lobby

### 2.1 Lobby code

- 6 characters, uppercase A–Z and 0–9, ambiguous characters removed (no `0/O`, `1/I/L`).
- Generated server-side on lobby create; collision-checked against active lobbies.
- Case-insensitive on join.

### 2.2 Host

- The player who creates the lobby is the host.
- Only the host sees settings controls and the **Start Game** button.
- If the host disconnects before the game starts, host rights pass to the earliest-joined
  remaining player.
- Once the game has started, host rights do not grant any gameplay advantage.

### 2.3 Host-configurable settings

| Setting | Type | Default | Range |
|---|---|---|---|
| `mafiaCount` | integer | 1 | 1 to `floor(playerCount / 3)` |
| `doctorEnabled` | boolean | true | — |
| `detectiveEnabled` | boolean | true | — |
| `discussionSeconds` | integer | 90 | 30 to 300 (in steps of 15) |
| `votingSeconds` | integer | 45 | 15 to 120 (in steps of 15) |
| `nightSeconds` | integer | 60 | 30 to 120 (in steps of 15) — per-sub-phase |

Settings are **locked** the moment the game starts and shown in a read-only "Rules" panel
during gameplay.

### 2.4 Lobby constraints before start

- The lobby cannot start until there are at least **5** players.
- `mafiaCount` must be `≤ floor(playerCount / 3)`. The host's slider auto-clamps as players
  join/leave.
- Players can join only while in the lobby (pre-game). Mid-game join is **not** supported in v1.
- A player leaving the lobby pre-game simply disappears from the list.

---

## 3. Round structure

A round has three phases, run in strict order:

```
NIGHT (sequential sub-phases)
  ├─ Mafia Kill   — nightSeconds
  ├─ Doctor Save  — nightSeconds   (skipped if doctor disabled or dead)
  └─ Detective Accuse — nightSeconds  (skipped if detective disabled or dead)
     ↓ resolve night → announce death (or "nobody died")
DISCUSSION — discussionSeconds
VOTING     — votingSeconds
     ↓ resolve vote → eliminate most-voted player, show splash
→ check win conditions → next round or end game
```

### 3.1 Night — Mafia Kill sub-phase

- Visible to: Mafia players only.
- Non-mafia living players see a "Night falls — the mafia are choosing their target…"
  waiting screen with a countdown.
- Mafia screen shows a list of all living non-mafia players with click-to-select buttons.
- All mafia players must agree. The mechanism is: **each mafia picks a target; the sub-phase
  ends when all living mafia have selected the same target.** If the timer runs out without
  agreement, the final count is tallied and the highest-voted target is killed (ties → random
  among tied). If no mafia submitted any pick, no one dies this round.
- Mafia see each other's picks live during the sub-phase.
- Dead players (if any mafia died earlier) do not participate.

### 3.2 Night — Doctor Save sub-phase

- Visible to: Doctor only (if role is enabled and the doctor is alive).
- Everyone else sees a "The doctor is making their rounds…" waiting screen with countdown.
- Doctor picks one player from the full living list.
- **Self-save rule:** The doctor may save themselves, **but not in two consecutive rounds**.
  If the doctor self-saved in round N, they cannot pick themselves in round N+1 (their own
  name is grayed out that round). This resets if a round passes without self-saving.
- If the doctor does not pick before the timer expires, no save is made.
- The doctor does **not** see who the mafia targeted (blind save).

### 3.3 Night — Detective Investigate sub-phase

- Visible to: Detective only (if enabled and alive).
- Everyone else sees "The detective is investigating…" with countdown.
- Detective picks one living player to investigate (their own name is excluded from the list —
  self-investigation gives no information).
- Investigation result is **private**: at Dawn, the detective receives a card saying
  "`<name>` is MAFIA" or "`<name>` is NOT mafia". No one else sees this.
- **If the detective is killed during this same night** (mafia killed them and doctor did
  not save), the investigation result is **lost** — the detective never learns the answer.
  Resolution order: night-end determines deaths first, then private detective result is
  delivered only if the detective is still alive.
- The detective may investigate the same player again on a later round, but it is wasteful.

### 3.4 Night resolution (server, atomic)

Executed when all sub-phases complete:

1. If Doctor's save target == Mafia's kill target → no death this round. Set `savedThisRound = true`.
2. Else → Mafia's kill target dies: `players[target].alive = false`.
3. If the Detective investigated this round **and** is still alive after step 2 → send a
   private `s.detectiveResult` to the detective's socket: `{ targetName, isMafia }`. If the
   detective died in step 2, no result is sent (the information is lost).
4. Record doctor's self-save for next-round constraint (§3.2).
5. Build a public "Dawn" announcement message (everyone sees):
   - If `savedThisRound` → "The doctor saved someone tonight. No one died."
   - Else if someone died → "`<name>` was found dead this morning."
   - Else (no mafia pick) → "The town was quiet. No one died."
   The detective's activity is **never** mentioned publicly.

### 3.5 Discussion phase

- Duration: `discussionSeconds` from host settings.
- Living players can send text messages into a shared chat.
- Dead players (spectators) can see the chat but **cannot send**.
- The dawn announcement from §3.4 is pinned to the top of the chat for this round.
- Nothing else happens during this phase — just chat and countdown.
- Chat is **enabled only during Discussion**. During Voting the input is disabled.

### 3.6 Voting phase

- Duration: `votingSeconds`.
- Every living player casts one vote for one **other** living player (or **Skip**).
  Players cannot vote for themselves — their own name is omitted from the ballot.
- Mafia **do** vote during the day phase (standard — they can deflect blame).
- Chat input is **disabled** during this phase (see §3.5).
- Players can change their vote freely until the timer expires. The vote tally is shown live
  (who voted for whom), so everyone can react.
- Spectators see the tally but cannot vote.
- When the timer expires:
  - If **Skip** has the plurality → nobody is eliminated. Splash: "The town could not decide."
  - If exactly one player has the plurality → that player is eliminated.
  - **If two or more players are tied** for the plurality → go to the Tie-Break sub-phase (§3.6.1).

### 3.6.1 Vote Tie-Break sub-phase

- Triggered only on a tie among non-Skip votes.
- Duration: **20 seconds** (fixed).
- Only the tied players appear on the ballot. Every living player (including the tied
  players themselves — but still not voting for themselves) votes again.
- At timer end, highest votes wins elimination. If still tied → **no elimination** this
  round, splash: "The town could not decide."

### 3.6.2 Vote splash

Splash screen (5 seconds, visible to everyone), after voting (and tie-break if any):
- If the eliminated player was Mafia: "`<name>` was MAFIA." Also show remaining-mafia count.
- If the eliminated player was not Mafia: "`<name>` was `<role>`. Beware — mafia is still in the game."
- If nobody was eliminated: "The town could not decide. Night falls again."

### 3.7 Round advance

After the voting splash, server checks win conditions (§4). If no winner, start the next
round at §3.1.

---

## 4. Win conditions

Checked after night resolution (§3.4) **and** after voting resolution (§3.6):

1. **Civilians win:** `aliveMafiaCount == 0`.
2. **Mafia win:** `aliveMafiaCount >= aliveNonMafiaCount` (parity — mafia outnumber or tie the rest).
3. Otherwise → continue to next phase/round.

> The detective does not have an instant-win mechanic in this variant. Civilians win only
> by voting out every mafia; the detective's role is to feed information to the day phase.

### 4.1 End-game screen

Full-screen result:
- Winning side banner (big)
- Full role reveal: every player's name + their role, with alive/dead status
- "Back to lobby" button — host can click to return everyone to the lobby with the same
  settings and player list for a rematch.

---

## 5. Spectator rules

- A dead player's screen converts to spectator mode immediately after the dawn announcement
  (or voting splash) that killed them.
- Spectators see:
  - Everything living players see (no fog of war).
  - All role identities (so they can enjoy watching the deception).
- Spectators cannot: chat, vote, pick night actions.

---

## 6. Disconnect handling (v1 — simple)

- If a player disconnects mid-game, mark them as **disconnected** but keep their slot and role.
- A disconnected living player does not count toward night-action timeouts (e.g., mafia agreement
  tally proceeds with only connected mafia).
- If they reconnect within **60 seconds** using the same name + lobby code, resume them.
- If they do not reconnect in 60 seconds, treat them as if they voted Skip this round and had
  no night action.
- The host disconnecting does not pause the game; the earliest-joined connected player
  silently inherits host (relevant only for post-game "Back to lobby").

---

## 7. Timing summary (defaults)

| Phase | Default seconds |
|---|---|
| Role reveal | 5 (fixed) |
| Night — Mafia Kill | 60 |
| Night — Doctor Save | 60 (skipped if no doctor alive) |
| Night — Detective Investigate | 60 (skipped if no detective alive) |
| Dawn splash | 5 (fixed) |
| Discussion | 90 |
| Voting | 45 |
| Vote Tie-Break (if tied) | 20 (fixed, only when needed) |
| Vote splash | 5 (fixed) |
| End-game screen | until host returns to lobby |

Total minimum round time (all roles alive, defaults): **5 + 60 + 60 + 60 + 5 + 90 + 45 + 5 = 330s ≈ 5.5 min**.
