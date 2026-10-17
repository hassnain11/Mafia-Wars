---
title: Mafia Wars
emoji: 🗡
colorFrom: red
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Real-time Mafia / Among Us social-deduction party game.
---

# Mafia Wars

A real-time, browser-based social deduction game inspired by classic Mafia / Among Us.
Friends join a lobby via a code, roles are assigned secretly (Mafia, Doctor, Detective, Civilian),
and each round follows a night → discussion → voting cycle until Mafia or Civilians win.

**Status:** Playable. See [`DEPLOY.md`](./DEPLOY.md) to go live.
**Platform:** Web (desktop + mobile browsers). No install.
**Multiplayer:** Online, real-time via WebSockets.
**Budget:** Zero — all hosting on free tiers.

## Quick start (local)
```bash
npm install
npm run dev
```
Opens the server on `:8080` and the client on `:5173`. Two browser tabs = full game.

## Deploy
See [`DEPLOY.md`](./DEPLOY.md) for GitHub + Fly.io + Cloudflare Pages, step by step.

---

## How to use this documentation

Read in this order:

| # | File | What it covers |
|---|------|----------------|
| 1 | [GAME_SPEC.md](./GAME_SPEC.md) | Rules, roles, round flow, win conditions, timings |
| 2 | [TECH_SPEC.md](./TECH_SPEC.md) | Stack, folder structure, hosting plan |
| 3 | [API_SPEC.md](./API_SPEC.md) | Socket.IO events, payloads, state machine, data models |
| 4 | [UI_SPEC.md](./UI_SPEC.md) | Every screen, what it shows, what the player can do |
| 5 | [BUILD_PLAN.md](./BUILD_PLAN.md) | Step-by-step phases Claude Code should follow to build it |
| 6 | [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md) | Decisions the user still needs to confirm before/while building |

If anything in the spec is ambiguous, treat `OPEN_QUESTIONS.md` as the source of truth —
unresolved items there must be asked to the user, not guessed.

---

## One-paragraph summary

A host creates a lobby and shares a 6-character code. Friends open the site, enter a name
and the code, and land in the lobby. The host picks the rules (number of mafia, whether
Doctor and Detective are in play, discussion-time length, voting-time length) and starts
the game. The server secretly assigns roles. Each round has a Night phase (Mafia picks a
target, Doctor picks someone to save, Detective makes one guess), a Discussion phase (text
chat for living players), and a Voting phase (every living player votes to eliminate someone).
Dead players become spectators — they can watch but not chat or vote. The game ends when
all Mafia are eliminated (Civilians win) or when Mafia ≥ remaining Civilians (Mafia win),
or when the Detective's guess is correct (Civilians win immediately).

---

## What this spec does **not** cover

- Account systems, persistent profiles, matchmaking, ranked play — this is lobby-code only.
- Voice chat — text chat only in v1.
- Monetization, ads, analytics beyond basic error logging.
- Mobile native apps — browser only in v1 (the UI is responsive and works on phone browsers).
