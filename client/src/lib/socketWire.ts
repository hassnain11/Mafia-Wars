import {
  EV,
  type ChatMessage,
  type DetectiveResultPayload,
  type ErrorPayload,
  type LobbyPublicState,
  type SelfView,
  type ToastPayload,
} from '@mafia/shared';
import { socket, connectSocket } from '../socket';
import { useGameStore } from '../store/gameStore';

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

  socket.on(EV.ERROR, (e: ErrorPayload) => {
    toastHandler({ text: e.message, level: 'error' });
  });

  socket.on(EV.TOAST, (t: ToastPayload) => {
    toastHandler(t);
  });

  useGameStore.setState({ connection: 'connecting' });
  connectSocket();
}
