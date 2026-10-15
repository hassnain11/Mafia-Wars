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
}

export class Lobby {
  readonly code: string;
  phase: Phase = PHASE.LOBBY;
  settings: Settings = { ...DEFAULT_SETTINGS };
  players: InternalPlayer[] = [];
  round = 0;
  phaseEndsAt: number | null = null;
  pinnedDawnMessage: string | null = null;
  phaseTimerId: NodeJS.Timeout | null = null;
  createdAt: number;

  constructor(code: string) {
    this.code = code;
    this.createdAt = Date.now();
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
    };
    this.players.push(player);
    return player;
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
    return {
      code: this.code,
      phase: this.phase,
      settings: this.settings,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        alive: p.alive,
        connected: p.connected,
      })),
      round: this.round,
      phaseEndsAt: this.phaseEndsAt,
      pinnedDawnMessage: this.pinnedDawnMessage,
    };
  }
}
