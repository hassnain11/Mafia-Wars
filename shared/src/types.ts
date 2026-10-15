// Enums and types shared by client and server.
// Mirrors API_SPEC.md §1.

export const ROLE = {
  MAFIA: 'mafia',
  DOCTOR: 'doctor',
  DETECTIVE: 'detective',
  CIVILIAN: 'civilian',
} as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

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
export type Phase = (typeof PHASE)[keyof typeof PHASE];

export const WINNER = {
  MAFIA: 'mafia',
  CIVILIANS: 'civilians',
} as const;
export type Winner = (typeof WINNER)[keyof typeof WINNER];

export const END_REASON = {
  ALL_MAFIA_ELIMINATED: 'all_mafia_eliminated',
  MAFIA_PARITY: 'mafia_parity',
} as const;
export type EndReason = (typeof END_REASON)[keyof typeof END_REASON];

export interface PublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  alive: boolean;
  connected: boolean;
  isBot: boolean;
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
  round: number;
  phaseEndsAt: number | null;
  pinnedDawnMessage: string | null;
  liveVotes?: Record<string, string | 'skip'>;
  tiebreakCandidates?: string[];
  mafiaPicks?: Record<string, string>;
}

export interface SelfView {
  selfId: string;
  myRole: Role | null;
  myMafiaTeammates?: string[];
  canAct: boolean;
  isSpectator: boolean;
}

export interface ChatMessage {
  from: { id: string; name: string };
  text: string;
  at: number;
}

export interface DawnAnnouncePayload {
  text: string;
  deadPlayerId: string | null;
  deadPlayerName: string | null;
  round: number;
  savedThisRound: boolean;
  doctorPresent: boolean;
  mafiaAttempted: boolean;
}

export interface DetectiveResultPayload {
  round: number;
  targetId: string;
  targetName: string;
  isMafia: boolean;
}

export interface VoteResultPayload {
  eliminatedId: string | null;
  eliminatedRole: Role | null;
  mafiaRemaining: number;
  text: string;
}

export interface GameEndedPayload {
  winner: Winner;
  reason: EndReason;
  fullReveal: Array<{ id: string; name: string; role: Role; alive: boolean }>;
}

export interface PhaseChangedPayload {
  phase: Phase;
  phaseEndsAt: number | null;
  round: number;
}

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
}

export interface ToastPayload {
  text: string;
  level: 'info' | 'warn';
}

// Error codes — API_SPEC.md §7.
export const ERROR_CODE = {
  NAME_INVALID: 'NAME_INVALID',
  NAME_TAKEN: 'NAME_TAKEN',
  LOBBY_NOT_FOUND: 'LOBBY_NOT_FOUND',
  LOBBY_IN_PROGRESS: 'LOBBY_IN_PROGRESS',
  LOBBY_FULL: 'LOBBY_FULL',
  NOT_HOST: 'NOT_HOST',
  NOT_ENOUGH_PLAYERS: 'NOT_ENOUGH_PLAYERS',
  INVALID_SETTINGS: 'INVALID_SETTINGS',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  INVALID_TARGET: 'INVALID_TARGET',
  SELF_SAVE_LOCKED: 'SELF_SAVE_LOCKED',
  PHASE_MISMATCH: 'PHASE_MISMATCH',
  RECONNECT_EXPIRED: 'RECONNECT_EXPIRED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

// Server-only ack payloads returned via socket.io callbacks.
export interface CreateLobbyAck {
  code: string;
  playerId: string;
}

export interface JoinLobbyAck {
  playerId: string;
}

export interface QuickMatchAck {
  queued: true;
  position: number;
  needed: number;
}

export interface MatchFoundPayload {
  code: string;
  playerId: string;
}

export interface QueueUpdatePayload {
  position: number;
  needed: number;
}
