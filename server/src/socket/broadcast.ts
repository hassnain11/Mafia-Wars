import type { Server as IOServer, Socket } from 'socket.io';
import { EV, type ErrorCode, type ErrorPayload } from '@mafia/shared';
import type { Lobby } from '../lobby/Lobby.js';

export function broadcastLobbyState(io: IOServer, lobby: Lobby): void {
  io.to(lobby.code).emit(EV.LOBBY_STATE, lobby.toPublic());
}

export function emitError(socket: Socket, code: ErrorCode, message: string): void {
  const payload: ErrorPayload = { code, message };
  socket.emit(EV.ERROR, payload);
}
