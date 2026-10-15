import { randomUUID } from 'node:crypto';
import {
  DEFAULT_SETTINGS,
  MAX_PLAYERS,
  PHASE,
  type LobbyPublicState,
  type Phase,
  type PublicPlayer,
  type Role,
  type Settings,
  mafiaCountMax,
} from '@mafia/shared';

export interface InternalPlayer extends PublicPlayer {
  role: Role | null;
  socketId: string | null;
  disconnectAt: number | null;
  joinedAt: number;
  isBot: boolean;
}

export interface NightActions {
  mafiaPicks: Map<string, string>;
  doctorSave: string | null;
  detectiveInvestigate: string | null;
}

export class Lobby {
  readonly code: string;
  phase: Phase = PHASE.LOBBY;
  settings: Settings = { ...DEFAULT_SETTINGS };
  players: InternalPlayer[] = [];
  round = 0;
  phaseEndsAt: number | null = null;
  pinnedDawnMessage: string | null = null;
  phaseTimerCancel: (() => void) | null = null;
  createdAt: number;

  nightActions: NightActions = { mafiaPicks: new Map(), doctorSave: null, detectiveInvestigate: null };
  votes = new Map<string, string | 'skip'>();
  tiebreakCandidates: string[] = [];
  lastDoctorSelfSaveRound: number | null = null;
  savedThisRound = false;
  lastDeadPlayerId: string | null = null;

  constructor(code: string) {
    this.code = code;
    this.createdAt = Date.now();
  }

  resetForNewGame(): void {
    this.round = 0;
    this.pinnedDawnMessage = null;
    this.nightActions = { mafiaPicks: new Map(), doctorSave: null, detectiveInvestigate: null };
    this.votes.clear();
    this.tiebreakCandidates = [];
    this.lastDoctorSelfSaveRound = null;
    this.savedThisRound = false;
    this.lastDeadPlayerId = null;
    for (const p of this.players) {
      p.role = null;
      p.alive = true;
    }
  }

  resetNightActions(): void {
    this.nightActions = { mafiaPicks: new Map(), doctorSave: null, detectiveInvestigate: null };
    this.savedThisRound = false;
    this.lastDeadPlayerId = null;
  }

  resetVotes(): void {
    this.votes.clear();
  }

  addPlayer(name: string, isHost: boolean, socketId: string): InternalPlayer {
    const player: InternalPlayer = {
      id: randomUUID(),
      name,
      isHost,
      alive: true,
      connected: true,
      role: null,
      socketId,
      disconnectAt: null,
      joinedAt: Date.now(),
      isBot: false,
    };
    this.players.push(player);
    return player;
  }

  addBot(name: string): InternalPlayer {
    const bot: InternalPlayer = {
      id: randomUUID(),
      name,
      isHost: false,
      alive: true,
      connected: true,
      role: null,
      socketId: null,
      disconnectAt: null,
      joinedAt: Date.now(),
      isBot: true,
    };
    this.players.push(bot);
    return bot;
  }

  removePlayer(playerId: string): InternalPlayer | undefined {
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx < 0) return undefined;
    const removed = this.players[idx]!;
    this.players.splice(idx, 1);
    if (removed.isHost) this.promoteNewHost();
    return removed;
  }

  getPlayer(playerId: string): InternalPlayer | undefined {
    return this.players.find((p) => p.id === playerId);
  }

  getPlayerBySocket(socketId: string): InternalPlayer | undefined {
    return this.players.find((p) => p.socketId === socketId);
  }

  isNameTaken(name: string, excludeId?: string): boolean {
    const needle = name.trim().toLowerCase();
    return this.players.some(
      (p) => p.id !== excludeId && p.name.toLowerCase() === needle,
    );
  }

  isFull(): boolean {
    return this.players.length >= MAX_PLAYERS;
  }

  isEmpty(): boolean {
    return this.players.length === 0;
  }

  promoteNewHost(): InternalPlayer | undefined {
    if (this.players.length === 0) return undefined;
    if (this.players.some((p) => p.isHost && p.connected)) return undefined;
    const connected = this.players
      .filter((p) => p.connected)
      .sort((a, b) => a.joinedAt - b.joinedAt);
    const next = connected[0] ?? [...this.players].sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (!next) return undefined;
    for (const p of this.players) p.isHost = p.id === next.id;
    return next;
  }

  mergeSettings(partial: Partial<Settings>): void {
    this.settings = { ...this.settings, ...partial };
    this.clampSettings();
  }

  clampSettings(): void {
    const maxMafia = Math.max(1, mafiaCountMax(this.players.length || 3));
    if (this.settings.mafiaCount > maxMafia) this.settings.mafiaCount = maxMafia;
    if (this.settings.mafiaCount < 1) this.settings.mafiaCount = 1;
  }

  toPublic(): LobbyPublicState {
    const state: LobbyPublicState = {
      code: this.code,
      phase: this.phase,
      settings: this.settings,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        alive: p.alive,
        connected: p.connected,
        isBot: p.isBot,
      })),
      round: this.round,
      phaseEndsAt: this.phaseEndsAt,
      pinnedDawnMessage: this.pinnedDawnMessage,
    };
    if (this.phase === PHASE.VOTING || this.phase === PHASE.VOTE_TIEBREAK) {
      state.liveVotes = Object.fromEntries(this.votes.entries());
    }
    if (this.phase === PHASE.VOTE_TIEBREAK) {
      state.tiebreakCandidates = this.tiebreakCandidates;
    }
    return state;
  }
}
