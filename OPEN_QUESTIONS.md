# OPEN_QUESTIONS — Mafia Wars

All questions have been resolved with the user. This file is kept as a decision log so
future readers understand *why* certain rules are the way they are. Any new ambiguity that
comes up during build should be appended here as a new section.

**Last reviewed:** 2026-10-15

---

## Resolved decisions

### Q1 — Detective: public accusation vs private investigation
**Decision: Private investigation (classic Mafia).**
Each night the detective picks one player and privately learns whether that player is mafia
or not. No instant-win mechanic. Detective shares info in Discussion if they choose.

Reflected in: `GAME_SPEC.md` §1.2, §3.3, §3.4, §4; `API_SPEC.md` §1.2 (`DetectiveResultPayload`),
§3.8, §4.5a; `UI_SPEC.md` §3.4, §3.5.

### Q2 — Doctor self-save
**Decision: Allowed, but not two rounds in a row.**
If the doctor self-saved in round N, their own name is disabled on their ballot in round N+1.
Resets after any round in which they did not self-save.

Reflected in: `GAME_SPEC.md` §3.2; `API_SPEC.md` §3.7 (`SELF_SAVE_LOCKED` error), internal state `lastDoctorSelfSaveRound`.

### Q3 — Does the doctor see who the mafia targeted?
**Decision: No — blind save.** Doctor picks from the full living list without knowing the
mafia's choice. Save is a real strategic decision.

Reflected in: `GAME_SPEC.md` §3.2.

### Q4 — Can mafia vote during the day?
**Decision: Yes.** Mafia vote during Discussion-end voting like everyone else. Standard
Mafia — they can strategically deflect votes.

Reflected in: `GAME_SPEC.md` §3.6.

### Q5 — Vote-tie resolution
**Decision: Revote among tied players, 20-second limit.**
On a plurality tie among two or more non-Skip players, enter a `VOTE_TIEBREAK` phase.
Ballot restricted to tied players, no Skip option. If still tied at the end → no elimination.

Reflected in: `GAME_SPEC.md` §3.6, §3.6.1, §3.6.2, §7; `API_SPEC.md` §1.1 (`VOTE_TIEBREAK` phase),
§1.2 (`tiebreakCandidates`), §3.10, §5; `UI_SPEC.md` §3.7a.

### Q6 — Can you vote for yourself?
**Decision: No.** Your own name is omitted from the ballot in both Voting and Tie-break.

Reflected in: `GAME_SPEC.md` §3.6; `API_SPEC.md` §3.10 (`INVALID_TARGET` on self-vote); `UI_SPEC.md` §3.7, §3.7a.

### Q7 — Chat during voting?
**Decision: No.** Chat input is active only during Discussion. During Voting and Tie-break
the input is replaced by a muted "Chat is closed — place your vote." banner.

Reflected in: `GAME_SPEC.md` §3.5; `API_SPEC.md` §3.9 (`PHASE_MISMATCH` outside Discussion);
`UI_SPEC.md` §3.6, §3.7.

### Q8 — Public reveal of detective's wrong accusation
**Moot** — superseded by Q1. In the private-investigation variant, the detective's activity
is never publicly announced; results are private to the detective.

### Q9 — Detective dies at night — does the investigation result still arrive?
**Decision: No — result is lost.**
Night resolution order: mafia kill → doctor save → compute deaths → **only if detective is
still alive**, emit the private `s.detectiveResult`. If the detective died this round, the
information is lost.

Reflected in: `GAME_SPEC.md` §3.3, §3.4; `API_SPEC.md` §3.8, §4.5a, §5.

### Q10 — Timing and player count ranges
**Decision: Defaults as drafted.**
Min 5, max 12 players. Discussion 30–300s (default 90). Voting 15–120s (default 45).
Night 30–120s (default 60).

Reflected in: `GAME_SPEC.md` §2.3, §7.

### Q11 — Max players
**Decision: 12** (default).

### Q12 — Min players
**Decision: 5** (default).

### Q13 — Mafia count formula
**Decision: `floor(players / 3)`** (mafia-friendly).
Lobby UI auto-clamps the mafia slider to this max.

| Players | Max mafia |
|---|---|
| 5 | 1 | 6 | 2 | 7 | 2 | 8 | 2 | 9 | 3 | 10 | 3 | 11 | 3 | 12 | 4 |

Reflected in: `GAME_SPEC.md` §2.3.

### Q14 — Connection indicator
**Decision: Defaults.** Green = connected, Amber = reconnecting (< 3s), Red = disconnected (> 3s with overlay).

### Q15 — Language
**Decision: English only for v1.** Roman Urdu / Urdu may be added later with an i18n layer
(non-goal in v1 per `TECH_SPEC.md` §6).

---

## How to use this log

- When a decision in this file is contradicted by a spec update, update the spec and leave
  the resolution here untouched (it's a historical record).
- When a new ambiguity surfaces during build, append it as `### Qn — <title>` with a draft
  resolution and ask the user before building against it.
