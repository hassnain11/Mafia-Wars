import { ROLE, type Role, type Settings } from '@mafia/shared';
import type { InternalPlayer } from '../lobby/Lobby.js';

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i]!, out[j]!] = [out[j]!, out[i]!];
  }
  return out;
}

export function assignRoles(players: InternalPlayer[], settings: Settings): void {
  const order = shuffle(players);
  const roles: Role[] = [];
  for (let i = 0; i < settings.mafiaCount; i++) roles.push(ROLE.MAFIA);
  if (settings.doctorEnabled) roles.push(ROLE.DOCTOR);
  if (settings.detectiveEnabled) roles.push(ROLE.DETECTIVE);
  while (roles.length < players.length) roles.push(ROLE.CIVILIAN);

  for (let i = 0; i < order.length; i++) {
    order[i]!.role = roles[i]!;
    order[i]!.alive = true;
  }
}

export function livingByRole(players: InternalPlayer[], role: Role): InternalPlayer[] {
  return players.filter((p) => p.alive && p.role === role);
}

export function anyLiving(players: InternalPlayer[], role: Role): boolean {
  return players.some((p) => p.alive && p.role === role);
}

export function anyLivingConnected(players: InternalPlayer[], role: Role): boolean {
  return players.some((p) => p.alive && p.connected && p.role === role);
}
