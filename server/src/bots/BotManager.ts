import { PHASE, ROLE, type Phase } from '@mafia/shared';
import type { Lobby, InternalPlayer } from '../lobby/Lobby.js';
import { logger } from '../util/logger.js';

export const BOT_NAMES = [
  'Rex', 'Nova', 'Zara', 'Milo', 'Juno', 'Kai', 'Lila', 'Finn', 'Mira', 'Rafi',
  'Suri', 'Aria', 'Dax', 'Nina', 'Ozzy', 'Pia', 'Quinn', 'Vee', 'Yuki', 'Theo',
];

export interface EngineHooks {
  onMafiaPick: (lobby: Lobby, mafiaId: string, targetId: string) => void;
  onDoctorPick: (lobby: Lobby, doctorId: string, targetId: string) => void;
  onDetectivePick: (lobby: Lobby, detectiveId: string, targetId: string) => void;
  onCastVote: (lobby: Lobby, voterId: string, targetId: string | 'skip') => boolean;
}

type Timer = ReturnType<typeof setTimeout>;

export class BotManager {
  private timers = new Map<string, Timer[]>();

  constructor(private readonly engine: EngineHooks) {}

  pickBotNames(count: number, taken: Set<string>): string[] {
    const pool = BOT_NAMES.filter((n) => !taken.has(n.toLowerCase()));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i]!, pool[j]!] = [pool[j]!, pool[i]!];
    }
    const out = pool.slice(0, count);
    while (out.length < count) out.push(`Bot${out.length + 1}`);
    return out;
  }

  onPhase(lobby: Lobby, phase: Phase): void {
    this.cancel(lobby);
    switch (phase) {
      case PHASE.NIGHT_MAFIA:
        this.scheduleMafia(lobby);
        break;
      case PHASE.NIGHT_DOCTOR:
        this.scheduleDoctor(lobby);
        break;
      case PHASE.NIGHT_DETECTIVE:
        this.scheduleDetective(lobby);
        break;
      case PHASE.VOTING:
      case PHASE.VOTE_TIEBREAK:
        this.scheduleVoting(lobby);
        break;
      default:
        break;
    }
  }

  cancel(lobby: Lobby): void {
    const list = this.timers.get(lobby.code);
    if (!list) return;
    for (const t of list) clearTimeout(t);
    this.timers.delete(lobby.code);
  }

  private add(lobby: Lobby, ms: number, fn: () => void): void {
    const list = this.timers.get(lobby.code) ?? [];
    const t = setTimeout(() => {
      try {
        fn();
      } catch (err) {
        logger.error({ err, code: lobby.code }, 'bot action threw');
      }
    }, ms);
    list.push(t);
    this.timers.set(lobby.code, list);
  }

  private scheduleMafia(lobby: Lobby): void {
    const botMafia = lobby.players.filter(
      (p) => p.isBot && p.alive && p.role === ROLE.MAFIA,
    );
    if (botMafia.length === 0) return;
    const victims = lobby.players.filter(
      (p) => p.alive && p.role !== ROLE.MAFIA,
    );
    if (victims.length === 0) return;
    const chosen = pickRandom(victims);
    for (const m of botMafia) {
      this.add(lobby, jitter(800, 2500), () => {
        if (lobby.phase === PHASE.NIGHT_MAFIA) {
          this.engine.onMafiaPick(lobby, m.id, chosen.id);
        }
      });
    }
  }

  private scheduleDoctor(lobby: Lobby): void {
    const doctor = lobby.players.find(
      (p) => p.isBot && p.alive && p.role === ROLE.DOCTOR,
    );
    if (!doctor) return;
    const options = lobby.players.filter((p) => p.alive);
    if (options.length === 0) return;
    const selfSaveLocked =
      lobby.lastDoctorSelfSaveRound !== null &&
      lobby.lastDoctorSelfSaveRound === lobby.round - 1;
    const nonSelf = options.filter((p) => p.id !== doctor.id);
    const canSelf = !selfSaveLocked && Math.random() < 0.25;
    const target = canSelf ? doctor : pickRandom(nonSelf.length ? nonSelf : options);
    this.add(lobby, jitter(1000, 2500), () => {
      if (lobby.phase === PHASE.NIGHT_DOCTOR) {
        this.engine.onDoctorPick(lobby, doctor.id, target.id);
      }
    });
  }

  private scheduleDetective(lobby: Lobby): void {
    const det = lobby.players.find(
      (p) => p.isBot && p.alive && p.role === ROLE.DETECTIVE,
    );
    if (!det) return;
    const options = lobby.players.filter((p) => p.alive && p.id !== det.id);
    if (options.length === 0) return;
    const target = pickRandom(options);
    this.add(lobby, jitter(1200, 2800), () => {
      if (lobby.phase === PHASE.NIGHT_DETECTIVE) {
        this.engine.onDetectivePick(lobby, det.id, target.id);
      }
    });
  }

  private scheduleVoting(lobby: Lobby): void {
    const bots = lobby.players.filter((p) => p.isBot && p.alive);
    if (bots.length === 0) return;
    for (const bot of bots) {
      this.add(lobby, jitter(1500, 4500), () => {
        if (lobby.phase !== PHASE.VOTING && lobby.phase !== PHASE.VOTE_TIEBREAK) return;
        const target = this.chooseVote(lobby, bot);
        this.engine.onCastVote(lobby, bot.id, target);
      });
    }
  }

  private chooseVote(lobby: Lobby, bot: InternalPlayer): string | 'skip' {
    const isTiebreak = lobby.phase === PHASE.VOTE_TIEBREAK;
    const livingOthers = lobby.players.filter((p) => p.alive && p.id !== bot.id);

    const candidates = isTiebreak
      ? livingOthers.filter((p) => lobby.tiebreakCandidates.includes(p.id))
      : livingOthers;
    if (candidates.length === 0) return isTiebreak ? pickRandom(livingOthers).id : 'skip';

    // Mafia bot: avoid voting a fellow mafia; pick a non-mafia to deflect.
    if (bot.role === ROLE.MAFIA) {
      const nonMafia = candidates.filter((p) => p.role !== ROLE.MAFIA);
      const pool = nonMafia.length ? nonMafia : candidates;
      return pickRandom(pool).id;
    }

    // Non-mafia bot: slight random skip chance in regular voting.
    if (!isTiebreak && Math.random() < 0.1) return 'skip';
    return pickRandom(candidates).id;
  }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function jitter(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min));
}
