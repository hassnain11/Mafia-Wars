import { END_REASON, ROLE, WINNER, type EndReason, type Winner } from '@mafia/shared';
import type { InternalPlayer } from '../lobby/Lobby.js';

export interface WinCheck {
  winner: Winner;
  reason: EndReason;
}

export function checkWin(players: InternalPlayer[]): WinCheck | null {
  const alive = players.filter((p) => p.alive);
  const mafiaAlive = alive.filter((p) => p.role === ROLE.MAFIA).length;
  const nonMafiaAlive = alive.length - mafiaAlive;

  if (mafiaAlive === 0) {
    return { winner: WINNER.CIVILIANS, reason: END_REASON.ALL_MAFIA_ELIMINATED };
  }
  if (mafiaAlive >= nonMafiaAlive) {
    return { winner: WINNER.MAFIA, reason: END_REASON.MAFIA_PARITY };
  }
  return null;
}
