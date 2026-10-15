import { io, type Socket } from 'socket.io-client';

const URL = import.meta.env.VITE_SERVER_URL ?? '';

export const socket: Socket = io(URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
});

export function connectSocket(): void {
  if (!socket.connected) socket.connect();
}

type AckResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export function emitAck<T>(event: string, payload: unknown, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} timed out`)), timeoutMs);
    socket.emit(event, payload, (res: AckResult<T>) => {
      clearTimeout(timer);
      if (res?.ok) resolve(res.data);
      else reject(res?.error ?? { code: 'INTERNAL_ERROR', message: 'Unknown error' });
    });
  });
}
