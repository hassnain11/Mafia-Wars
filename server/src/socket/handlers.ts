import type { Server as IOServer, Socket } from 'socket.io';
import { z } from 'zod';
import {
  CreateLobbySchema,
  ERROR_CODE,
  EV,
  JoinLobbySchema,
  LeaveLobbySchema,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PHASE,
  ReconnectSchema,
  ROLE_REVEAL_SECONDS,
  RECONNECT_GRACE_MS,
  StartGameSchema,
  UpdateSettingsSchema,
  type CreateLobbyAck,
  type ErrorCode,
  type JoinLobbyAck,
  type PhaseChangedPayload,
} from '@mafia/shared';
import { logger } from '../util/logger.js';
import { LobbyManager } from '../lobby/LobbyManager.js';
import type { Lobby } from '../lobby/Lobby.js';
import { broadcastLobbyState, emitError } from './broadcast.js';

type Ack<T> = (res: { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } }) => void;

const errMsg: Record<ErrorCode, string> = {
  NAME_INVALID: 'Name is invalid.',
  NAME_TAKEN: 'Name is already taken in this lobby.',
  LOBBY_NOT_FOUND: 'Lobby not found.',
  LOBBY_IN_PROGRESS: 'This lobby has already started.',
  LOBBY_FULL: 'This lobby is full.',
  NOT_HOST: 'Only the host can do that.',
  NOT_ENOUGH_PLAYERS: `Need at least ${MIN_PLAYERS} players.`,
  INVALID_SETTINGS: 'Settings are invalid.',
  NOT_YOUR_TURN: 'Not your turn.',
  INVALID_TARGET: 'Invalid target.',
  SELF_SAVE_LOCKED: 'You cannot save yourself two rounds in a row.',
  PHASE_MISMATCH: 'That action is not allowed in this phase.',
  RECONNECT_EXPIRED: 'Reconnect window expired.',
  RATE_LIMITED: 'Slow down a bit.',
  INTERNAL_ERROR: 'Something went wrong.',
};

const fail = (code: ErrorCode) => ({ ok: false as const, error: { code, message: errMsg[code] } });

function parse<T>(schema: z.ZodType<T>, payload: unknown): T | null {
  const r = schema.safeParse(payload);
  return r.success ? r.data : null;
}

export function registerHandlers(io: IOServer, manager: LobbyManager): void {
  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'socket connected');

    socket.on(EV.CREATE_LOBBY, (payload, ack: Ack<CreateLobbyAck>) => {
      const parsed = parse(CreateLobbySchema, payload);
      if (!parsed) return ack(fail(ERROR_CODE.NAME_INVALID));

      const lobby = manager.create();
      const player = lobby.addPlayer(parsed.name, true, socket.id);
      socket.join(lobby.code);
      socket.data.lobbyCode = lobby.code;
      socket.data.playerId = player.id;

      logger.info({ code: lobby.code, playerId: player.id, name: player.name }, 'lobby created');
      ack({ ok: true, data: { code: lobby.code, playerId: player.id } });
      broadcastLobbyState(io, lobby);
    });

    socket.on(EV.JOIN_LOBBY, (payload, ack: Ack<JoinLobbyAck>) => {
      const parsed = parse(JoinLobbySchema, payload);
      if (!parsed) return ack(fail(ERROR_CODE.NAME_INVALID));

      const lobby = manager.get(parsed.code);
      if (!lobby) return ack(fail(ERROR_CODE.LOBBY_NOT_FOUND));
      if (lobby.phase !== PHASE.LOBBY) return ack(fail(ERROR_CODE.LOBBY_IN_PROGRESS));
      if (lobby.players.length >= MAX_PLAYERS) return ack(fail(ERROR_CODE.LOBBY_FULL));
      if (lobby.isNameTaken(parsed.name)) return ack(fail(ERROR_CODE.NAME_TAKEN));

      const player = lobby.addPlayer(parsed.name, false, socket.id);
      socket.join(lobby.code);
      socket.data.lobbyCode = lobby.code;
      socket.data.playerId = player.id;
      lobby.clampSettings();

      logger.info({ code: lobby.code, playerId: player.id, name: player.name }, 'player joined');
      ack({ ok: true, data: { playerId: player.id } });
      broadcastLobbyState(io, lobby);
    });

    socket.on(EV.UPDATE_SETTINGS, (payload) => {
      const lobby = currentLobby(socket, manager);
      if (!lobby) return;
      const player = lobby.getPlayerBySocket(socket.id);
      if (!player) return;
      if (!player.isHost) return emitError(socket, ERROR_CODE.NOT_HOST, errMsg.NOT_HOST);
      if (lobby.phase !== PHASE.LOBBY) {
        return emitError(socket, ERROR_CODE.PHASE_MISMATCH, errMsg.PHASE_MISMATCH);
      }

      const parsed = parse(UpdateSettingsSchema, payload);
      if (!parsed) return emitError(socket, ERROR_CODE.INVALID_SETTINGS, errMsg.INVALID_SETTINGS);
      lobby.mergeSettings(parsed);
      broadcastLobbyState(io, lobby);
    });

    socket.on(EV.LEAVE_LOBBY, (payload) => {
      if (!parse(LeaveLobbySchema, payload ?? {})) return;
      handleLeave(socket, manager, io, 'leave');
    });

    socket.on(EV.START_GAME, (payload) => {
      if (!parse(StartGameSchema, payload ?? {})) return;
      const lobby = currentLobby(socket, manager);
      if (!lobby) return;
      const player = lobby.getPlayerBySocket(socket.id);
      if (!player?.isHost) return emitError(socket, ERROR_CODE.NOT_HOST, errMsg.NOT_HOST);
      if (lobby.phase !== PHASE.LOBBY) {
        return emitError(socket, ERROR_CODE.PHASE_MISMATCH, errMsg.PHASE_MISMATCH);
      }
      if (lobby.players.length < MIN_PLAYERS) {
        return emitError(socket, ERROR_CODE.NOT_ENOUGH_PLAYERS, errMsg.NOT_ENOUGH_PLAYERS);
      }

      // Phase 3 placeholder: flip to ROLE_REVEAL for 1s, then back to LOBBY.
      // Phase 5 will replace this with the real engine.
      lobby.phase = PHASE.ROLE_REVEAL;
      lobby.round = 1;
      lobby.phaseEndsAt = Date.now() + ROLE_REVEAL_SECONDS * 1000;
      broadcastLobbyState(io, lobby);
      const phaseEvt: PhaseChangedPayload = {
        phase: lobby.phase,
        phaseEndsAt: lobby.phaseEndsAt,
        round: lobby.round,
      };
      io.to(lobby.code).emit(EV.PHASE_CHANGED, phaseEvt);

      if (lobby.phaseTimerId) clearTimeout(lobby.phaseTimerId);
      lobby.phaseTimerId = setTimeout(() => {
        lobby.phase = PHASE.LOBBY;
        lobby.round = 0;
        lobby.phaseEndsAt = null;
        lobby.phaseTimerId = null;
        broadcastLobbyState(io, lobby);
        io.to(lobby.code).emit(EV.PHASE_CHANGED, {
          phase: lobby.phase,
          phaseEndsAt: null,
          round: 0,
        } satisfies PhaseChangedPayload);
      }, 1000);
    });

    socket.on(EV.RECONNECT, (payload, ack: Ack<{ reattached: true }>) => {
      const parsed = parse(ReconnectSchema, payload);
      if (!parsed) return ack(fail(ERROR_CODE.RECONNECT_EXPIRED));
      const lobby = manager.get(parsed.code);
      if (!lobby) return ack(fail(ERROR_CODE.LOBBY_NOT_FOUND));
      const player = lobby.getPlayer(parsed.playerId);
      if (!player) return ack(fail(ERROR_CODE.RECONNECT_EXPIRED));

      const withinGrace =
        !player.connected &&
        player.disconnectAt !== null &&
        Date.now() - player.disconnectAt <= RECONNECT_GRACE_MS;
      const allowedInLobby = lobby.phase === PHASE.LOBBY;

      if (!withinGrace && !allowedInLobby && player.connected === false) {
        return ack(fail(ERROR_CODE.RECONNECT_EXPIRED));
      }

      player.socketId = socket.id;
      player.connected = true;
      player.disconnectAt = null;
      socket.join(lobby.code);
      socket.data.lobbyCode = lobby.code;
      socket.data.playerId = player.id;
      ack({ ok: true, data: { reattached: true } });
      broadcastLobbyState(io, lobby);
    });

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'socket disconnected');
      handleLeave(socket, manager, io, 'disconnect');
    });
  });
}

function currentLobby(socket: Socket, manager: LobbyManager): Lobby | undefined {
  const code = socket.data.lobbyCode as string | undefined;
  if (!code) return undefined;
  return manager.get(code);
}

function handleLeave(
  socket: Socket,
  manager: LobbyManager,
  io: IOServer,
  reason: 'leave' | 'disconnect',
): void {
  const lobby = currentLobby(socket, manager);
  if (!lobby) return;
  const player = lobby.getPlayerBySocket(socket.id);
  if (!player) return;

  socket.leave(lobby.code);

  if (lobby.phase === PHASE.LOBBY || reason === 'leave') {
    const removed = lobby.removePlayer(player.id);
    logger.info(
      { code: lobby.code, playerId: removed?.id, reason },
      'player removed from lobby',
    );
    socket.data.lobbyCode = undefined;
    socket.data.playerId = undefined;
    if (lobby.isEmpty()) {
      manager.remove(lobby.code);
      return;
    }
    lobby.clampSettings();
    broadcastLobbyState(io, lobby);
    return;
  }

  // Mid-game disconnect: keep slot, start grace timer.
  player.connected = false;
  player.disconnectAt = Date.now();
  player.socketId = null;
  if (player.isHost) lobby.promoteNewHost();
  broadcastLobbyState(io, lobby);
}
