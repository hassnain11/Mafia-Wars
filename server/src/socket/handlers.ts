import type { Server as IOServer, Socket } from 'socket.io';
import { z } from 'zod';
import {
  CastVoteSchema,
  ChatSendSchema,
  CreateLobbySchema,
  ERROR_CODE,
  EV,
  JoinLobbySchema,
  LeaveLobbySchema,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NightDetectiveInvestigateSchema,
  NightDoctorPickSchema,
  NightMafiaPickSchema,
  PHASE,
  ReconnectSchema,
  RECONNECT_GRACE_MS,
  ReturnToLobbySchema,
  ROLE,
  StartGameSchema,
  UpdateSettingsSchema,
  type CreateLobbyAck,
  type ErrorCode,
  type JoinLobbyAck,
} from '@mafia/shared';
import { logger } from '../util/logger.js';
import { LobbyManager } from '../lobby/LobbyManager.js';
import type { Lobby } from '../lobby/Lobby.js';
import { broadcastLobbyState, emitError } from './broadcast.js';
import { GameEngine } from '../game/GameEngine.js';
import { RateLimiter } from './rateLimiter.js';

type Ack<T> = (
  res: { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } },
) => void;

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
  const sockets = new Map<string, Socket>();
  const limiter = new RateLimiter();

  const engine = new GameEngine(io, (_lobby, playerId) => {
    const p = _lobby.getPlayer(playerId);
    const sid = p?.socketId;
    return sid ? sockets.get(sid) : undefined;
  });

  function on<Payload = unknown>(
    socket: Socket,
    event: string,
    handler: (payload: Payload, ack?: unknown) => void,
  ): void {
    socket.on(event, (payload: Payload, ack: unknown) => {
      if (!limiter.take(socket.id, event)) {
        if (typeof ack === 'function') {
          (ack as Ack<unknown>)(fail(ERROR_CODE.RATE_LIMITED));
        } else {
          emitError(socket, ERROR_CODE.RATE_LIMITED, errMsg.RATE_LIMITED);
        }
        return;
      }
      try {
        handler(payload, ack);
      } catch (err) {
        logger.error({ err, event, socketId: socket.id }, 'handler threw');
        if (typeof ack === 'function') {
          (ack as Ack<unknown>)(fail(ERROR_CODE.INTERNAL_ERROR));
        } else {
          emitError(socket, ERROR_CODE.INTERNAL_ERROR, errMsg.INTERNAL_ERROR);
        }
      }
    });
  }

  io.on('connection', (socket) => {
    sockets.set(socket.id, socket);
    logger.info({ socketId: socket.id }, 'socket connected');

    on(socket, EV.CREATE_LOBBY, (payload, ackRaw) => {
      const ack = ackRaw as Ack<CreateLobbyAck>;
      const parsed = parse(CreateLobbySchema, payload);
      if (!parsed) return ack(fail(ERROR_CODE.NAME_INVALID));

      const lobby = manager.create();
      const player = lobby.addPlayer(parsed.name, true, socket.id);
      socket.join(lobby.code);
      socket.data.lobbyCode = lobby.code;
      socket.data.playerId = player.id;

      logger.info(
        { code: lobby.code, playerId: player.id, name: player.name },
        'lobby created',
      );
      ack({ ok: true, data: { code: lobby.code, playerId: player.id } });
      broadcastLobbyState(io, lobby);
    });

    on(socket, EV.JOIN_LOBBY, (payload, ackRaw) => {
      const ack = ackRaw as Ack<JoinLobbyAck>;
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

      logger.info(
        { code: lobby.code, playerId: player.id, name: player.name },
        'player joined',
      );
      ack({ ok: true, data: { playerId: player.id } });
      broadcastLobbyState(io, lobby);
    });

    on(socket, EV.UPDATE_SETTINGS, (payload) => {
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

    on(socket, EV.LEAVE_LOBBY, (payload) => {
      if (!parse(LeaveLobbySchema, payload ?? {})) return;
      handleLeave(socket, manager, io, 'leave');
    });

    on(socket, EV.START_GAME, (payload) => {
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
      lobby.clampSettings();
      engine.start(lobby);
    });

    on(socket, EV.NIGHT_MAFIA_PICK, (payload) => {
      const parsed = parse(NightMafiaPickSchema, payload);
      const lobby = currentLobby(socket, manager);
      if (!parsed || !lobby) return;
      const player = lobby.getPlayerBySocket(socket.id);
      if (!player) return;
      if (lobby.phase !== PHASE.NIGHT_MAFIA)
        return emitError(socket, ERROR_CODE.PHASE_MISMATCH, errMsg.PHASE_MISMATCH);
      if (!player.alive || player.role !== ROLE.MAFIA)
        return emitError(socket, ERROR_CODE.NOT_YOUR_TURN, errMsg.NOT_YOUR_TURN);
      const target = lobby.getPlayer(parsed.targetId);
      if (!target || !target.alive || target.role === ROLE.MAFIA)
        return emitError(socket, ERROR_CODE.INVALID_TARGET, errMsg.INVALID_TARGET);
      engine.onMafiaPick(lobby, player.id, target.id);
    });

    on(socket, EV.NIGHT_DOCTOR_PICK, (payload) => {
      const parsed = parse(NightDoctorPickSchema, payload);
      const lobby = currentLobby(socket, manager);
      if (!parsed || !lobby) return;
      const player = lobby.getPlayerBySocket(socket.id);
      if (!player) return;
      if (lobby.phase !== PHASE.NIGHT_DOCTOR)
        return emitError(socket, ERROR_CODE.PHASE_MISMATCH, errMsg.PHASE_MISMATCH);
      if (!player.alive || player.role !== ROLE.DOCTOR)
        return emitError(socket, ERROR_CODE.NOT_YOUR_TURN, errMsg.NOT_YOUR_TURN);
      const target = lobby.getPlayer(parsed.targetId);
      if (!target || !target.alive)
        return emitError(socket, ERROR_CODE.INVALID_TARGET, errMsg.INVALID_TARGET);
      if (
        target.id === player.id &&
        lobby.lastDoctorSelfSaveRound !== null &&
        lobby.lastDoctorSelfSaveRound === lobby.round - 1
      ) {
        return emitError(socket, ERROR_CODE.SELF_SAVE_LOCKED, errMsg.SELF_SAVE_LOCKED);
      }
      engine.onDoctorPick(lobby, player.id, target.id);
    });

    on(socket, EV.NIGHT_DETECTIVE_INVESTIGATE, (payload) => {
      const parsed = parse(NightDetectiveInvestigateSchema, payload);
      const lobby = currentLobby(socket, manager);
      if (!parsed || !lobby) return;
      const player = lobby.getPlayerBySocket(socket.id);
      if (!player) return;
      if (lobby.phase !== PHASE.NIGHT_DETECTIVE)
        return emitError(socket, ERROR_CODE.PHASE_MISMATCH, errMsg.PHASE_MISMATCH);
      if (!player.alive || player.role !== ROLE.DETECTIVE)
        return emitError(socket, ERROR_CODE.NOT_YOUR_TURN, errMsg.NOT_YOUR_TURN);
      const target = lobby.getPlayer(parsed.targetId);
      if (!target || !target.alive || target.id === player.id)
        return emitError(socket, ERROR_CODE.INVALID_TARGET, errMsg.INVALID_TARGET);
      engine.onDetectivePick(lobby, player.id, target.id);
    });

    on(socket, EV.CHAT_SEND, (payload) => {
      const parsed = parse(ChatSendSchema, payload);
      const lobby = currentLobby(socket, manager);
      if (!parsed || !lobby) return;
      const player = lobby.getPlayerBySocket(socket.id);
      if (!player) return;
      if (lobby.phase !== PHASE.DISCUSSION)
        return emitError(socket, ERROR_CODE.PHASE_MISMATCH, errMsg.PHASE_MISMATCH);
      if (!player.alive) return;
      engine.onChatSend(lobby, player, parsed.text);
    });

    on(socket, EV.CAST_VOTE, (payload) => {
      const parsed = parse(CastVoteSchema, payload);
      const lobby = currentLobby(socket, manager);
      if (!parsed || !lobby) return;
      const player = lobby.getPlayerBySocket(socket.id);
      if (!player) return;
      if (lobby.phase !== PHASE.VOTING && lobby.phase !== PHASE.VOTE_TIEBREAK)
        return emitError(socket, ERROR_CODE.PHASE_MISMATCH, errMsg.PHASE_MISMATCH);
      if (!player.alive)
        return emitError(socket, ERROR_CODE.NOT_YOUR_TURN, errMsg.NOT_YOUR_TURN);
      const target = parsed.targetId;
      if (target !== 'skip') {
        const tp = lobby.getPlayer(target);
        if (!tp || !tp.alive || tp.id === player.id)
          return emitError(socket, ERROR_CODE.INVALID_TARGET, errMsg.INVALID_TARGET);
        if (
          lobby.phase === PHASE.VOTE_TIEBREAK &&
          !lobby.tiebreakCandidates.includes(target)
        ) {
          return emitError(socket, ERROR_CODE.INVALID_TARGET, errMsg.INVALID_TARGET);
        }
      } else if (lobby.phase === PHASE.VOTE_TIEBREAK) {
        return emitError(socket, ERROR_CODE.INVALID_TARGET, errMsg.INVALID_TARGET);
      }
      engine.onCastVote(lobby, player.id, target);
    });

    on(socket, EV.RETURN_TO_LOBBY, (payload) => {
      if (!parse(ReturnToLobbySchema, payload ?? {})) return;
      const lobby = currentLobby(socket, manager);
      if (!lobby) return;
      const player = lobby.getPlayerBySocket(socket.id);
      if (!player?.isHost) return emitError(socket, ERROR_CODE.NOT_HOST, errMsg.NOT_HOST);
      if (lobby.phase !== PHASE.ENDED)
        return emitError(socket, ERROR_CODE.PHASE_MISMATCH, errMsg.PHASE_MISMATCH);
      engine.returnToLobby(lobby);
    });

    on(socket, EV.RECONNECT, (payload, ackRaw) => {
      const ack = ackRaw as Ack<{ reattached: true }>;
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
      const allowedInLobby =
        lobby.phase === PHASE.LOBBY &&
        (player.connected ||
          (player.disconnectAt !== null &&
            Date.now() - player.disconnectAt <= PRE_GAME_GRACE_MS));

      if (!player.connected && !withinGrace && !allowedInLobby) {
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
      sockets.delete(socket.id);
      limiter.drop(socket.id);
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

const PRE_GAME_GRACE_MS = 10_000;

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
  socket.data.lobbyCode = undefined;
  socket.data.playerId = undefined;

  if (reason === 'leave') {
    const removed = lobby.removePlayer(player.id);
    logger.info({ code: lobby.code, playerId: removed?.id, reason }, 'player left');
    if (lobby.isEmpty()) {
      manager.remove(lobby.code);
      return;
    }
    lobby.clampSettings();
    broadcastLobbyState(io, lobby);
    return;
  }

  // Disconnect: keep the slot. In LOBBY, give a short grace to survive a
  // refresh; in-game grace is RECONNECT_GRACE_MS (handled by reconnect check).
  player.connected = false;
  player.disconnectAt = Date.now();
  player.socketId = null;
  if (player.isHost) lobby.promoteNewHost();
  broadcastLobbyState(io, lobby);

  if (lobby.phase === PHASE.LOBBY) {
    setTimeout(() => {
      const stillHere = lobby.getPlayer(player.id);
      if (!stillHere || stillHere.connected) return;
      lobby.removePlayer(stillHere.id);
      logger.info(
        { code: lobby.code, playerId: stillHere.id },
        'player removed after pre-game grace',
      );
      if (lobby.isEmpty()) {
        manager.remove(lobby.code);
        return;
      }
      lobby.clampSettings();
      broadcastLobbyState(io, lobby);
    }, PRE_GAME_GRACE_MS);
  }
}
