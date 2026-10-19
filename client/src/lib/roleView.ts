// Who sees whom as what role.
// Rules (per user's spec):
//   - You always see yourself as your real role (reveal + own avatar).
//   - Mafia see each other as Mafia.
//   - Everyone else — including dead/spectator players — sees everyone
//     publicly as Civilian during the game.
//   - After the game ends, every seat is shown with its real role in the
//     final-reveal screen (that's where the full reveal is shown).
//
// `displayRoleFor` returns the role the viewer should SEE on the given
// player. Pass `revealedRoles` from s.gameEnded.fullReveal (keyed by
// player id) to flip everyone to their real role at end-of-game.

import { ROLE, type Role, type SelfView } from '@mafia/shared';

export function displayRoleFor(
  self: SelfView | null,
  targetId: string,
  revealedRoles?: Record<string, Role> | null,
): Role {
  if (revealedRoles && revealedRoles[targetId]) return revealedRoles[targetId]!;
  if (!self) return ROLE.CIVILIAN;
  if (targetId === self.selfId) return self.myRole ?? ROLE.CIVILIAN;
  if (self.myRole === ROLE.MAFIA && (self.myMafiaTeammates ?? []).includes(targetId)) {
    return ROLE.MAFIA;
  }
  return ROLE.CIVILIAN;
}

export function buildRevealedRoles(
  reveal: ReadonlyArray<{ id: string; role: Role }> | undefined,
): Record<string, Role> | null {
  if (!reveal) return null;
  const map: Record<string, Role> = {};
  for (const p of reveal) map[p.id] = p.role;
  return map;
}
