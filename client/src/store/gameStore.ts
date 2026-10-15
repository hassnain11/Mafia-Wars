import { create } from 'zustand';
import type {
  ChatMessage,
  DawnAnnouncePayload,
  DetectiveResultPayload,
  GameEndedPayload,
  LobbyPublicState,
  SelfView,
  VoteResultPayload,
} from '@mafia/shared';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface GameStoreState {
  connection: ConnectionStatus;
  lobby: LobbyPublicState | null;
  self: SelfView | null;
  chat: ChatMessage[];
  investigations: DetectiveResultPayload[];
  playerId: string | null;
  lastDawn: DawnAnnouncePayload | null;
  lastVoteResult: VoteResultPayload | null;
  lastGameEnded: GameEndedPayload | null;

  setConnection: (c: ConnectionStatus) => void;
  setLobby: (l: LobbyPublicState | null) => void;
  setSelf: (s: SelfView | null) => void;
  setPlayerId: (id: string | null) => void;
  appendChat: (m: ChatMessage) => void;
  appendInvestigation: (r: DetectiveResultPayload) => void;
  setDawn: (d: DawnAnnouncePayload | null) => void;
  setVoteResult: (v: VoteResultPayload | null) => void;
  setGameEnded: (g: GameEndedPayload | null) => void;
  resetGame: () => void;
}

const PID_KEY = 'mafia.playerId';
const CODE_KEY = 'mafia.code';

export function loadPersisted(): { playerId: string | null; code: string | null } {
  try {
    return {
      playerId: sessionStorage.getItem(PID_KEY),
      code: sessionStorage.getItem(CODE_KEY),
    };
  } catch {
    return { playerId: null, code: null };
  }
}

export function persistSession(playerId: string, code: string): void {
  try {
    sessionStorage.setItem(PID_KEY, playerId);
    sessionStorage.setItem(CODE_KEY, code);
  } catch {
    // ignore storage errors
  }
}

export function clearPersistedSession(): void {
  try {
    sessionStorage.removeItem(PID_KEY);
    sessionStorage.removeItem(CODE_KEY);
  } catch {
    // ignore
  }
}

export const useGameStore = create<GameStoreState>((set) => ({
  connection: 'disconnected',
  lobby: null,
  self: null,
  chat: [],
  investigations: [],
  playerId: null,
  lastDawn: null,
  lastVoteResult: null,
  lastGameEnded: null,

  setConnection: (connection) => set({ connection }),
  setLobby: (lobby) => set({ lobby }),
  setSelf: (self) => set({ self }),
  setPlayerId: (playerId) => set({ playerId }),
  appendChat: (m) => set((s) => ({ chat: [...s.chat, m] })),
  appendInvestigation: (r) => set((s) => ({ investigations: [...s.investigations, r] })),
  setDawn: (d) => set({ lastDawn: d }),
  setVoteResult: (v) => set({ lastVoteResult: v }),
  setGameEnded: (g) => set({ lastGameEnded: g }),
  resetGame: () =>
    set({
      lobby: null,
      self: null,
      chat: [],
      investigations: [],
      playerId: null,
      lastDawn: null,
      lastVoteResult: null,
      lastGameEnded: null,
    }),
}));
