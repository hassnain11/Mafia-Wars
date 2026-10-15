import {
  EV,
  type ChatMessage,
  type DawnAnnouncePayload,
  type DetectiveResultPayload,
  type ErrorPayload,
  type GameEndedPayload,
  type LobbyPublicState,
  type SelfView,
  type ToastPayload,
  type VoteResultPayload,
} from '@mafia/shared';
import { socket, connectSocket, emitAck } from '../socket';
import { clearPersistedSession, loadPersisted, useGameStore } from '../store/gameStore';

let bound = false;

type ToastHandler = (p: ToastPayload | { text: string; level: 'info' | 'warn' | 'error' }) => void;
let toastHandler: ToastHandler = () => {};
export function setToastHandler(h: ToastHandler): void {
  toastHandler = h;
}

export function initSocket(): void {
  if (bound) return;
  bound = true;

  const store = useGameStore.getState;

  socket.on('connect', () => useGameStore.setState({ connection: 'connected' }));
  socket.on('disconnect', () => useGameStore.setState({ connection: 'disconnected' }));
  socket.io.on('reconnect_attempt', () =>
    useGameStore.setState({ connection: 'connecting' }),
  );

  socket.on(EV.LOBBY_STATE, (state: LobbyPublicState) => {
    useGameStore.setState({ lobby: state });
  });

  socket.on(EV.SELF_VIEW, (self: SelfView) => {
    useGameStore.setState({ self });
  });

  socket.on(EV.CHAT_MSG, (msg: ChatMessage) => {
    store().appendChat(msg);
  });

  socket.on(EV.DETECTIVE_RESULT, (r: DetectiveResultPayload) => {
    store().appendInvestigation(r);
  });

  socket.on(EV.DAWN_ANNOUNCE, (p: DawnAnnouncePayload) => {
    store().setDawn(p);
  });

  socket.on(EV.VOTE_RESULT, (p: VoteResultPayload) => {
    store().setVoteResult(p);
  });

  socket.on(EV.GAME_ENDED, (p: GameEndedPayload) => {
    store().setGameEnded(p);
  });

  socket.on(EV.PHASE_CHANGED, (p: { phase: string }) => {
    // Clear stale cutscene data when leaving dawn/vote_result/ended.
    const s = store();
    if (p.phase !== 'dawn' && s.lastDawn) {
      // keep lastDawn through the discussion/voting so detective can refer back if needed;
      // we clear only when a NEW night starts.
      if (p.phase === 'night_mafia') s.setDawn(null);
    }
    if (p.phase === 'ended') return;
    if (p.phase !== 'vote_result' && s.lastVoteResult && p.phase === 'night_mafia') {
      s.setVoteResult(null);
    }
  });

  socket.on(EV.ERROR, (e: ErrorPayload) => {
    toastHandler({ text: e.message, level: 'error' });
  });

  socket.on(EV.TOAST, (t: ToastPayload) => {
    toastHandler(t);
  });

  socket.on('connect', async () => {
    const { playerId, code } = loadPersisted();
    if (!playerId || !code) return;
    try {
      await emitAck<{ reattached: true }>(EV.RECONNECT, { playerId, code }, 3000);
      useGameStore.setState({ playerId });
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err?.code === 'RECONNECT_EXPIRED' || err?.code === 'LOBBY_NOT_FOUND') {
        clearPersistedSession();
        useGameStore.getState().resetGame();
        toastHandler({ text: 'Your session expired.', level: 'warn' });
      }
    }
  });

  useGameStore.setState({ connection: 'connecting' });
  connectSocket();
}
