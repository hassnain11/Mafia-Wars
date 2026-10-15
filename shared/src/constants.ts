// Game-wide constants. Keep these in sync with GAME_SPEC.md.

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 12;

export const LOBBY_CODE_LENGTH = 6;
export const LOBBY_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L

export const NAME_MIN = 1;
export const NAME_MAX = 20;
export const NAME_PATTERN = /^[A-Za-z0-9 ._-]+$/;

export const CHAT_MAX = 280;

export const RECONNECT_GRACE_MS = 60_000;

// Fixed timings (seconds) — not host-configurable.
export const ROLE_REVEAL_SECONDS = 6;
export const DAWN_SECONDS = 14;
export const VOTE_RESULT_SECONDS = 6;
export const VOTE_TIEBREAK_SECONDS = 20;

// Cutscene step durations (ms) within DAWN — must sum ≤ DAWN_SECONDS*1000.
export const CUTSCENE_MAFIA_MS = 4500;
export const CUTSCENE_DOCTOR_MS = 4000;
export const CUTSCENE_DETECTIVE_MS = 4000;

// Host-configurable timings — ranges, step, defaults.
export const DISCUSSION_SECONDS_MIN = 30;
export const DISCUSSION_SECONDS_MAX = 300;
export const DISCUSSION_SECONDS_DEFAULT = 90;

export const VOTING_SECONDS_MIN = 15;
export const VOTING_SECONDS_MAX = 120;
export const VOTING_SECONDS_DEFAULT = 45;

export const NIGHT_SECONDS_MIN = 30;
export const NIGHT_SECONDS_MAX = 120;
export const NIGHT_SECONDS_DEFAULT = 60;

export const SETTINGS_SECONDS_STEP = 15;

export const MAFIA_COUNT_MIN = 1;
export const mafiaCountMax = (playerCount: number) => Math.floor(playerCount / 3);

import type { Settings } from './types.js';

export const DEFAULT_SETTINGS: Settings = {
  mafiaCount: 1,
  doctorEnabled: true,
  detectiveEnabled: true,
  discussionSeconds: DISCUSSION_SECONDS_DEFAULT,
  votingSeconds: VOTING_SECONDS_DEFAULT,
  nightSeconds: NIGHT_SECONDS_DEFAULT,
};
