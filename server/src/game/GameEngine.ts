import type { Server as IOServer, Socket } from 'socket.io';
import {
  DAWN_SECONDS,
  EV,
  PHASE,
  ROLE,
  ROLE_REVEAL_SECONDS,
  VOTE_RESULT_SECONDS,
  VOTE_TIEBREAK_SECONDS,
  type DawnAnnouncePayload,
  type DetectiveResultPayload,
  type GameEndedPayload,
  type Phase,
  type PhaseChangedPayload,
  type Role,
  type SelfView,
  type VoteResultPayload,
} from '@mafia/shared';
import { logger } from '../util/logger.js';
import { startTimer } from '../util/timer.js';
import type { Lobby, InternalPlayer } from '../lobby/Lobby.js';
import { anyLiving, anyLivingConnected, assignRoles } from './roles.js';
import { checkWin } from './winConditions.js';
import { broadcastLobbyState } from '../socket/broadcast.js';

export class GameEngine {
  private onPhaseEntered: ((lobby: Lobby, phase: Phase) => void) | null = null;

  constructor(
    private readonly io: IOServer,
    private readonly getSocketByPlayerId: (lobby: Lobby, playerId: string) => Socket | undefined,
  ) {}

  setPhaseListener(fn: (lobby: Lobby, phase: Phase) => void): void {
    this.onPhaseEntered = fn;
  }

  start(lobby: Lobby): void {
    lobby.resetForNewGame();
    assignRoles(lobby.players, lobby.settings);
    lobby.round = 1;
    this.sendSelfViewsAll(lobby);
    this.enter(lobby, PHASE.ROLE_REVEAL);
  }

  private enter(lobby: Lobby, phase: Phase): void {
    lobby.phaseTimerCancel?.();
    lobby.phaseTimerCancel = null;
    lobby.phase = phase;

    const ms = this.phaseDurationMs(lobby, phase);
    lobby.phaseEndsAt = ms > 0 ? Date.now() + ms : null;

    this.onPhaseEnter(lobby, phase);

    broadcastLobbyState(this.io, lobby);
    this.sendSelfViewsAll(lobby);
    this.emitPhaseChanged(lobby);

    if (ms > 0) {
      const t = startTimer(ms, () => this.onTimerEnd(lobby, phase));
      lobby.phaseTimerCancel = t.cancel;
    }

    this.onPhaseEntered?.(lobby, phase);
  }

  private phaseDurationMs(lobby: Lobby, phase: Phase): number {
    switch (phase) {
      case PHASE.ROLE_REVEAL:
        return ROLE_REVEAL_SECONDS * 1000;
      case PHASE.NIGHT_MAFIA:
      case PHASE.NIGHT_DOCTOR:
      case PHASE.NIGHT_DETECTIVE:
        return lobby.settings.nightSeconds * 1000;
      case PHASE.DAWN:
        return DAWN_SECONDS * 1000;
      case PHASE.DISCUSSION:
        return lobby.settings.discussionSeconds * 1000;
      case PHASE.VOTING:
        return lobby.settings.votingSeconds * 1000;
      case PHASE.VOTE_TIEBREAK:
        return VOTE_TIEBREAK_SECONDS * 1000;
      case PHASE.VOTE_RESULT:
        return VOTE_RESULT_SECONDS * 1000;
      case PHASE.LOBBY:
      case PHASE.ENDED:
      default:
        return 0;
    }
  }

  private onPhaseEnter(lobby: Lobby, phase: Phase): void {
    switch (phase) {
      case PHASE.NIGHT_MAFIA:
        lobby.resetNightActions();
        break;
      case PHASE.NIGHT_DOCTOR:
      case PHASE.NIGHT_DETECTIVE:
        break;
      case PHASE.DAWN:
        this.resolveNight(lobby);
        break;
      case PHASE.VOTING:
      case PHASE.VOTE_TIEBREAK:
        lobby.resetVotes();
        break;
      default:
        break;
    }
  }

  private onTimerEnd(lobby: Lobby, phase: Phase): void {
    if (lobby.phase !== phase) return; // superseded
    switch (phase) {
      case PHASE.ROLE_REVEAL:
        this.enter(lobby, PHASE.NIGHT_MAFIA);
        break;
      case PHASE.NIGHT_MAFIA:
        this.finalizeMafiaPick(lobby);
        this.enterNightDoctor(lobby);
        break;
      case PHASE.NIGHT_DOCTOR:
        this.enterNightDetective(lobby);
        break;
      case PHASE.NIGHT_DETECTIVE:
        this.enter(lobby, PHASE.DAWN);
        break;
      case PHASE.DAWN: {
        const won = checkWin(lobby.players);
        if (won) return this.endGame(lobby, won.winner, won.reason);
        this.enter(lobby, PHASE.DISCUSSION);
        break;
      }
      case PHASE.DISCUSSION:
        this.enter(lobby, PHASE.VOTING);
        break;
      case PHASE.VOTING:
        this.resolveVoting(lobby);
        break;
      case PHASE.VOTE_TIEBREAK:
        this.resolveTiebreak(lobby);
        break;
      case PHASE.VOTE_RESULT: {
        const won = checkWin(lobby.players);
        if (won) return this.endGame(lobby, won.winner, won.reason);
        lobby.round += 1;
        this.enter(lobby, PHASE.NIGHT_MAFIA);
        break;
      }
      default:
        break;
    }
  }

  // ---- Night sub-phases ---------------------------------------------------

  onMafiaPick(lobby: Lobby, mafiaId: string, targetId: string): void {
    if (lobby.phase !== PHASE.NIGHT_MAFIA) return;
    lobby.nightActions.mafiaPicks.set(mafiaId, targetId);
    this.broadcastMafiaPicks(lobby);
    // Disconnected mafia don't block consensus (GAME_SPEC §6).
    const mafiaActive = lobby.players.filter(
      (p) => p.alive && p.connected && p.role === ROLE.MAFIA,
    );
    const everyoneAgreed =
      mafiaActive.length > 0 &&
      mafiaActive.every((m) => lobby.nightActions.mafiaPicks.get(m.id) === targetId);
    if (everyoneAgreed) {
      this.finalizeMafiaPick(lobby);
      this.enterNightDoctor(lobby);
    }
  }

  onDoctorPick(lobby: Lobby, doctorId: string, targetId: string): void {
    if (lobby.phase !== PHASE.NIGHT_DOCTOR) return;
    lobby.nightActions.doctorSave = targetId;
    if (targetId === doctorId) lobby.lastDoctorSelfSaveRound = lobby.round;
    this.enterNightDetective(lobby);
  }

  onDetectivePick(lobby: Lobby, _detectiveId: string, targetId: string): void {
    if (lobby.phase !== PHASE.NIGHT_DETECTIVE) return;
    lobby.nightActions.detectiveInvestigate = targetId;
    this.enter(lobby, PHASE.DAWN);
  }

  private enterNightDoctor(lobby: Lobby): void {
    if (
      !lobby.settings.doctorEnabled ||
      !anyLiving(lobby.players, ROLE.DOCTOR) ||
      !anyLivingConnected(lobby.players, ROLE.DOCTOR)
    ) {
      return this.enterNightDetective(lobby);
    }
    this.enter(lobby, PHASE.NIGHT_DOCTOR);
  }

  private enterNightDetective(lobby: Lobby): void {
    if (
      !lobby.settings.detectiveEnabled ||
      !anyLiving(lobby.players, ROLE.DETECTIVE) ||
      !anyLivingConnected(lobby.players, ROLE.DETECTIVE)
    ) {
      return this.enter(lobby, PHASE.DAWN);
    }
    this.enter(lobby, PHASE.NIGHT_DETECTIVE);
  }

  private finalizeMafiaPick(lobby: Lobby): void {
    // If mafia haven't agreed by timer, pick the plurality target among picks.
    const picks = Array.from(lobby.nightActions.mafiaPicks.values());
    if (picks.length === 0) return;
    const tally = new Map<string, number>();
    for (const t of picks) tally.set(t, (tally.get(t) ?? 0) + 1);
    const max = Math.max(...tally.values());
    const top = Array.from(tally.entries())
      .filter(([, n]) => n === max)
      .map(([id]) => id);
    const chosen = top[Math.floor(Math.random() * top.length)]!;
    // Replace all picks with the chosen one so resolveNight sees unanimous intent.
    lobby.nightActions.mafiaPicks.clear();
    for (const m of lobby.players.filter((p) => p.alive && p.role === ROLE.MAFIA)) {
      lobby.nightActions.mafiaPicks.set(m.id, chosen);
    }
  }

  private resolveNight(lobby: Lobby): void {
    const kill = Array.from(lobby.nightActions.mafiaPicks.values())[0] ?? null;
    const save = lobby.nightActions.doctorSave;
    const invTarget = lobby.nightActions.detectiveInvestigate;

    let deadId: string | null = null;
    if (kill && kill !== save) {
      const victim = lobby.players.find((p) => p.id === kill);
      if (victim && victim.alive) {
        victim.alive = false;
        deadId = victim.id;
      }
    }
    lobby.savedThisRound = kill !== null && kill === save;
    lobby.lastDeadPlayerId = deadId;

    const detective = lobby.players.find((p) => p.role === ROLE.DETECTIVE && p.alive);
    if (detective && invTarget) {
      const target = lobby.players.find((p) => p.id === invTarget);
      if (target) {
        const sock = this.getSocketByPlayerId(lobby, detective.id);
        if (sock) {
          const payload: DetectiveResultPayload = {
            round: lobby.round,
            targetId: target.id,
            targetName: target.name,
            isMafia: target.role === ROLE.MAFIA,
          };
          sock.emit(EV.DETECTIVE_RESULT, payload);
        }
      }
    }

    let text: string;
    if (lobby.savedThisRound) {
      text = 'The doctor saved someone tonight. No one died.';
    } else if (deadId) {
      const victim = lobby.players.find((p) => p.id === deadId);
      text = victim ? `${victim.name} was found dead this morning.` : 'Someone died in the night.';
    } else {
      text = 'The town was quiet. No one died.';
    }
    lobby.pinnedDawnMessage = text;

    const announce: DawnAnnouncePayload = {
      text,
      deadPlayerId: deadId,
      round: lobby.round,
    };
    this.io.to(lobby.code).emit(EV.DAWN_ANNOUNCE, announce);
  }

  // ---- Chat ---------------------------------------------------------------

  onChatSend(lobby: Lobby, player: InternalPlayer, text: string): boolean {
    if (lobby.phase !== PHASE.DISCUSSION) return false;
    if (!player.alive) return false;
    this.io.to(lobby.code).emit(EV.CHAT_MSG, {
      from: { id: player.id, name: player.name },
      text,
      at: Date.now(),
    });
    return true;
  }

  // ---- Voting -------------------------------------------------------------

  onCastVote(lobby: Lobby, voterId: string, target: string | 'skip'): boolean {
    if (lobby.phase !== PHASE.VOTING && lobby.phase !== PHASE.VOTE_TIEBREAK) return false;
    lobby.votes.set(voterId, target);
    broadcastLobbyState(this.io, lobby);
    const living = lobby.players.filter((p) => p.alive);
    if (lobby.votes.size >= living.length) {
      if (lobby.phase === PHASE.VOTING) this.resolveVoting(lobby);
      else this.resolveTiebreak(lobby);
    }
    return true;
  }

  private tallyVotes(lobby: Lobby): Map<string, number> {
    const tally = new Map<string, number>();
    for (const t of lobby.votes.values()) tally.set(t, (tally.get(t) ?? 0) + 1);
    return tally;
  }

  private resolveVoting(lobby: Lobby): void {
    const tally = this.tallyVotes(lobby);
    const nonSkip = Array.from(tally.entries()).filter(([k]) => k !== 'skip');
    const skipCount = tally.get('skip') ?? 0;

    if (nonSkip.length === 0) {
      return this.showVoteResult(lobby, null);
    }
    const maxVotes = Math.max(...nonSkip.map(([, n]) => n));
    const topIds = nonSkip.filter(([, n]) => n === maxVotes).map(([id]) => id);

    if (skipCount > maxVotes) {
      return this.showVoteResult(lobby, null);
    }
    if (topIds.length === 1) {
      return this.showVoteResult(lobby, topIds[0]!);
    }
    // Tie — enter tie-break
    lobby.tiebreakCandidates = topIds;
    this.enter(lobby, PHASE.VOTE_TIEBREAK);
  }

  private resolveTiebreak(lobby: Lobby): void {
    const tally = this.tallyVotes(lobby);
    const entries = Array.from(tally.entries()).filter(([k]) => k !== 'skip');
    if (entries.length === 0) return this.showVoteResult(lobby, null);
    const max = Math.max(...entries.map(([, n]) => n));
    const top = entries.filter(([, n]) => n === max).map(([id]) => id);
    const eliminatedId = top.length === 1 ? top[0]! : null;
    lobby.tiebreakCandidates = [];
    this.showVoteResult(lobby, eliminatedId);
  }

  private showVoteResult(lobby: Lobby, eliminatedId: string | null): void {
    let eliminatedRole: Role | null = null;
    let text: string;
    if (eliminatedId) {
      const target = lobby.players.find((p) => p.id === eliminatedId);
      if (target) {
        target.alive = false;
        eliminatedRole = target.role;
      }
      if (eliminatedRole === ROLE.MAFIA) {
        const mafiaRemaining = lobby.players.filter(
          (p) => p.alive && p.role === ROLE.MAFIA,
        ).length;
        text = `${target?.name ?? 'They'} was MAFIA. ${mafiaRemaining} mafia remaining.`;
      } else {
        text = `${target?.name ?? 'They'} was a ${eliminatedRole ?? 'Civilian'}. Beware — mafia is still in the game.`;
      }
    } else {
      text = 'The town could not decide. Night falls again.';
    }

    const mafiaRemaining = lobby.players.filter((p) => p.alive && p.role === ROLE.MAFIA).length;
    const payload: VoteResultPayload = {
      eliminatedId,
      eliminatedRole,
      mafiaRemaining,
      text,
    };
    this.enter(lobby, PHASE.VOTE_RESULT);
    this.io.to(lobby.code).emit(EV.VOTE_RESULT, payload);
  }

  // ---- End-of-game --------------------------------------------------------

  private endGame(lobby: Lobby, winner: GameEndedPayload['winner'], reason: GameEndedPayload['reason']): void {
    lobby.phaseTimerCancel?.();
    lobby.phaseTimerCancel = null;
    lobby.phase = PHASE.ENDED;
    lobby.phaseEndsAt = null;

    const payload: GameEndedPayload = {
      winner,
      reason,
      fullReveal: lobby.players.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role ?? 'civilian',
        alive: p.alive,
      })),
    };
    broadcastLobbyState(this.io, lobby);
    this.sendSelfViewsAll(lobby);
    this.emitPhaseChanged(lobby);
    this.io.to(lobby.code).emit(EV.GAME_ENDED, payload);
    logger.info({ code: lobby.code, winner, reason }, 'game ended');
  }

  returnToLobby(lobby: Lobby): void {
    lobby.phaseTimerCancel?.();
    lobby.phaseTimerCancel = null;
    lobby.phase = PHASE.LOBBY;
    lobby.phaseEndsAt = null;
    lobby.resetForNewGame();
    // Drop fully disconnected players.
    lobby.players = lobby.players.filter((p) => p.connected || p.socketId !== null);
    broadcastLobbyState(this.io, lobby);
    this.sendSelfViewsAll(lobby);
    this.emitPhaseChanged(lobby);
  }

  // ---- Views + emits ------------------------------------------------------

  private emitPhaseChanged(lobby: Lobby): void {
    const payload: PhaseChangedPayload = {
      phase: lobby.phase,
      phaseEndsAt: lobby.phaseEndsAt,
      round: lobby.round,
    };
    this.io.to(lobby.code).emit(EV.PHASE_CHANGED, payload);
  }

  private broadcastMafiaPicks(lobby: Lobby): void {
    const picks = Object.fromEntries(lobby.nightActions.mafiaPicks.entries());
    for (const m of lobby.players.filter((p) => p.role === ROLE.MAFIA)) {
      const sock = this.getSocketByPlayerId(lobby, m.id);
      sock?.emit(EV.LOBBY_STATE, { ...lobby.toPublic(), mafiaPicks: picks });
    }
  }

  private sendSelfViewsAll(lobby: Lobby): void {
    for (const p of lobby.players) {
      const sock = this.getSocketByPlayerId(lobby, p.id);
      if (!sock) continue;
      sock.emit(EV.SELF_VIEW, this.buildSelfView(lobby, p));
    }
  }

  private buildSelfView(lobby: Lobby, p: InternalPlayer): SelfView {
    const canAct = this.canAct(lobby, p);
    const view: SelfView = {
      selfId: p.id,
      myRole: p.role,
      canAct,
      isSpectator: !p.alive && lobby.phase !== PHASE.LOBBY && lobby.phase !== PHASE.ENDED,
    };
    if (p.role === ROLE.MAFIA) {
      view.myMafiaTeammates = lobby.players
        .filter((o) => o.role === ROLE.MAFIA && o.id !== p.id)
        .map((o) => o.id);
    }
    return view;
  }

  private canAct(lobby: Lobby, p: InternalPlayer): boolean {
    if (!p.alive) return false;
    switch (lobby.phase) {
      case PHASE.NIGHT_MAFIA:
        return p.role === ROLE.MAFIA;
      case PHASE.NIGHT_DOCTOR:
        return p.role === ROLE.DOCTOR;
      case PHASE.NIGHT_DETECTIVE:
        return p.role === ROLE.DETECTIVE;
      case PHASE.DISCUSSION:
      case PHASE.VOTING:
      case PHASE.VOTE_TIEBREAK:
        return true;
      default:
        return false;
    }
  }
}
