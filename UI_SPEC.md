# UI_SPEC — Mafia Wars

Every screen, what it shows, what controls it has, and which state it is in.
Mobile-first (phone-portrait), scales up gracefully on tablet/desktop.

Design language: dark theme (slate-900 background, slate-100 text), accent **red-500** for
mafia / danger, **emerald-500** for safety / civilian, **amber-400** for warnings, **sky-400**
for info. Rounded cards, generous padding, large tap targets (min 44px).

---

## 1. HomePage  (`/`)

**Shown when:** app loads, no active lobby session.

**Layout:**
- App title: "Mafia Wars"
- Tagline: "Deceive. Deduce. Survive."
- One input: `Your name` (1–20 chars)
- Two buttons: **Create Lobby** (primary) / **Join Lobby** (secondary)
- When "Join" is active → second input appears: `Lobby code` (6 chars, auto-uppercase)
- Below: a 2-line "How it works" blurb

**Actions:**
- Create → emit `c.createLobby` → on ack, route to `/lobby/:code`
- Join → emit `c.joinLobby` → on ack, route to `/lobby/:code`

**Validation (client-side, soft):**
- Name required, 1–20 chars.
- Code required (if joining), exactly 6 chars after uppercase.
- Server errors render as a red banner above the buttons.

---

## 2. LobbyPage  (`/lobby/:code`)

**Shown when:** `phase === LOBBY`.

**Layout (phone portrait):**
```
┌──────────────────────────────┐
│   Lobby code:  ABC123   📋   │  ← tap-to-copy
├──────────────────────────────┤
│  Players (4/12)              │
│   • Hassnain  (host 👑, you) │
│   • Ali                      │
│   • Sara                     │
│   • Omar                     │
├──────────────────────────────┤
│  Rules                       │   ← read-only for non-hosts
│   Mafia count:   [ 1 ⌃⌄ ]    │
│   Doctor:        [ ✓ ]        │
│   Detective:     [ ✓ ]        │
│   Discussion:    [ 90s ⌃⌄ ]   │
│   Voting:        [ 45s ⌃⌄ ]   │
│   Night action:  [ 60s ⌃⌄ ]   │
├──────────────────────────────┤
│   [ Start Game ]  (host only)│
│   [ Leave Lobby ]             │
└──────────────────────────────┘
```

**Actions:**
- Tap code → copy to clipboard, show toast "Copied".
- Host sliders/toggles → emit `c.updateSettings` (debounced 200ms).
- **Start Game** disabled until `players.length >= MIN_PLAYERS (5)` and settings valid.
- **Leave** → emit `c.leaveLobby`, route to `/`.

**Non-host view:** settings panel renders as read-only text, no Start button.

**Edge cases:**
- Host leaves → earliest-joined becomes host → UI updates automatically on next `s.lobbyState`.
- Fewer than 5 players → tooltip under Start button: "Need at least 5 players."

---

## 3. GamePage  (`/lobby/:code`, phase != LOBBY)

Single route; the sub-screen is chosen by `phase`.

### 3.1 RoleRevealScreen  (phase `ROLE_REVEAL`, 5s)

Full-screen splash:
- Role name in giant text, colored:
  - Mafia → red-500 "You are MAFIA"
  - Doctor → emerald-500 "You are the DOCTOR"
  - Detective → sky-400 "You are the DETECTIVE"
  - Civilian → slate-100 "You are a CIVILIAN"
- One-line role description under it.
- **If Mafia:** list teammates: "Your fellow mafia: Ali, Omar."
- Countdown ring: 5 → 4 → 3 → 2 → 1.

No controls. Auto-advance on `s.phaseChanged`.

### 3.2 NightMafiaScreen  (phase `NIGHT_MAFIA`)

**If I am mafia and alive:**
```
┌──────────────────────────────┐
│  🌙 Night — pick a target     │
│  00:47                        │  ← countdown
├──────────────────────────────┤
│  Mafia: Ali, Omar (you)       │
├──────────────────────────────┤
│  Choose target:               │
│   ○ Hassnain                  │
│   ● Sara    ← you picked      │
│   ○ Zain                      │
├──────────────────────────────┤
│  Picks so far:                │
│    Ali → Sara                 │
│    Omar → Sara                │
│                               │
│  (all mafia agreed — ending…) │
└──────────────────────────────┘
```

**If I am NOT mafia and alive:**
```
🌙 Night falls.
The mafia are choosing their target…
00:47
```

**If dead:** spectator view (see §3.9).

### 3.3 NightDoctorScreen  (phase `NIGHT_DOCTOR`)

**If I am doctor and alive:** list of all living players, pick one to save. Confirm button.
Timer visible.

**Else:** waiting screen "The doctor is making their rounds…" + timer.

Skipped entirely if doctor is disabled or dead → clients receive `s.phaseChanged` directly
to `NIGHT_DETECTIVE`.

### 3.4 NightDetectiveScreen  (phase `NIGHT_DETECTIVE`)

**If I am detective and alive:**
- Headline: "Investigate one player"
- Sub: "You will privately learn whether they are mafia. Choose carefully."
- List of all living players **excluding yourself**. Tap to pick, Confirm to submit.
- Below the list: a persistent "Your investigations so far" card listing every past result
  (round, target name, mafia/not-mafia) — this is populated from `s.detectiveResult` events
  stored in the client store across rounds.
- Timer visible.

**Else:** waiting screen "The detective is investigating…" + timer.

### 3.5 DawnScreen  (phase `DAWN`, 5s)

Full-screen announcement:
- Big banner with the dawn text (from `s.dawnAnnounce`).
- If someone died, show their name and (optionally) their role card.
- 5s countdown.
- **If I am the detective and alive**: a private card slides in below the banner showing
  this round's investigation result (from `s.detectiveResult`): e.g., "Ali is **MAFIA**" in
  red, or "Ali is **not mafia**" in slate. Nobody else sees this card.

Spectators see the public banner only.

### 3.6 DiscussionScreen  (phase `DISCUSSION`)

```
┌──────────────────────────────┐
│  💬 Discussion   01:30         │
├──────────────────────────────┤
│  Pinned: "Sara was found dead │
│  this morning."               │
├──────────────────────────────┤
│  Chat                         │
│   Ali: who's acting weird?    │
│   Omar: I think it was Zain.  │
│   …                           │
├──────────────────────────────┤
│  [ type a message… ] [ Send ] │
└──────────────────────────────┘
```

- Dead players: input is replaced by a muted banner "You are a spectator. You can watch but not chat."
- Chat auto-scrolls; show the last 50 messages, lazy-load older on scroll (v1: just render all).
- Chat input is only active during `DISCUSSION`. In `VOTING` and `VOTE_TIEBREAK` the input
  is replaced by a muted banner "Chat is closed — place your vote."

### 3.7 VotingScreen  (phase `VOTING`)

```
┌──────────────────────────────┐
│  🗳  Vote           00:45     │
├──────────────────────────────┤
│  Who is mafia?                │
│    [ Ali          ] 2 votes   │
│    [ Omar         ] 0         │
│    [ Hassnain     ] 0         │
│    [ Skip         ] 1         │
├──────────────────────────────┤
│  Your vote: Ali   [change]    │
└──────────────────────────────┘
```

- Your own name is **omitted** from the ballot.
- Tapping a row changes your vote (unlimited changes until timer end).
- Each row shows live vote count.
- Spectators see counts, no tap targets.
- Chat input (shared with Discussion) is disabled and shows "Chat is closed — place your vote."

### 3.7a VoteTiebreakScreen  (phase `VOTE_TIEBREAK`, 20s)

Shown only when `VOTING` ended with a plurality tie among 2+ non-Skip players.

```
┌──────────────────────────────┐
│  ⚖  Tie-break      00:20     │
├──────────────────────────────┤
│  Still undecided. Vote again │
│  between the tied players:   │
│    [ Ali        ] 2 votes    │
│    [ Omar       ] 2 votes    │
├──────────────────────────────┤
│  Your vote: —    [select]    │
└──────────────────────────────┘
```

- Ballot is restricted to the tied players (`tiebreakCandidates`).
- **No Skip option** here — you must pick one (or let the timer run out).
- Your own name is still excluded even if you are tied.
- If still tied at timer end → no elimination this round.

### 3.8 VoteResultScreen  (phase `VOTE_RESULT`, 5s)

Full-screen splash:
- If eliminated was Mafia:
  > "Ali was **MAFIA**.
  > Civilians cheer. 1 mafia remaining."
- If eliminated was non-mafia:
  > "Omar was a **Civilian**.
  > Beware — mafia is still in the game."
- If no one eliminated:
  > "The town could not decide. Night falls again."
- 5s countdown.

### 3.9 Spectator overlay (any phase)

- Small banner at top: "👁 Spectating — you were eliminated in round N."
- All controls disabled; chat input hidden.
- Everything else renders identically to a living player's view (full fog-of-war disabled —
  spectators see all roles once they're dead; shown as little role chips in the player list).

### 3.10 EndGameScreen  (phase `ENDED`)

```
┌──────────────────────────────┐
│   🏆  CIVILIANS WIN           │
│   The detective caught the    │
│   mafia red-handed.           │
├──────────────────────────────┤
│  Final roles                  │
│   Hassnain — Mafia  💀 Round 2│
│   Ali       — Civilian ✓      │
│   Sara      — Doctor  💀 R1   │
│   Omar      — Detective ✓     │
│   Zain      — Civilian ✓      │
├──────────────────────────────┤
│  [ Back to lobby ]  (host)    │
│  [ Leave ]                    │
└──────────────────────────────┘
```

- Winning banner color: red for Mafia, emerald for Civilians.
- `Back to lobby` only shown to host; everyone else sees "Waiting for host…" after the game
  ends; when host clicks, server fires `s.phaseChanged` → `LOBBY` for all.
- `Leave` returns to `/` and emits `c.leaveLobby`.

---

## 4. Global UI elements

### 4.1 Header

Thin bar at the top on all pages:
- Left: app logo + name.
- Center (in-game): current phase + round number ("Round 2 — Discussion").
- Right: connection indicator (dot: green/amber/red).

### 4.2 Countdown component

Reusable component. Takes `endsAt` (unix ms). Renders:
- `MM:SS` for timers > 10s.
- Big centered digit for last 10s, with pulsing scale animation.
- `0:00` and "time's up" state.

Updates on `requestAnimationFrame`, drifts corrected by server `phaseEndsAt`.

### 4.3 Toasts

- Position: bottom-center on mobile, bottom-right on desktop.
- Dismiss on tap, or auto after 4s.
- Levels: info (sky), warn (amber), error (red).

### 4.4 Disconnected state

- If the socket is disconnected for > 3s, show a fullscreen overlay: "Reconnecting…" with a spinner.
- On reconnect ack, overlay fades out and the server-pushed state replaces anything stale.

---

## 5. Accessibility

- Minimum tap target 44×44 px.
- All interactive elements have visible focus rings.
- Color is never the sole channel for meaning — roles also have icon + label.
- `aria-live="polite"` on dawn/vote splashes so screen readers announce them.
- Countdown has `aria-live="off"` to avoid spamming (phase name is announced instead).

---

## 6. Responsive breakpoints

| Width | Layout |
|---|---|
| `< 640px` | Single column, full-width cards, large taps |
| `640–1024px` | Two-column where helpful (player list left, action right) |
| `> 1024px` | Max content width 960px, centered |

No separate desktop layout — same components, Tailwind variants.
