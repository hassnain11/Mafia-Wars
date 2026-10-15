import { ROLE } from '@mafia/shared';
import { useGameStore } from '../store/gameStore';
import { Countdown } from '../components/Countdown';

export function RoleReveal() {
  const self = useGameStore((s) => s.self);
  const lobby = useGameStore((s) => s.lobby);
  if (!self || !lobby) return null;

  const role = self.myRole;
  const roleName = role ? role.toUpperCase() : 'UNKNOWN';
  const color =
    role === ROLE.MAFIA
      ? 'text-red-500'
      : role === ROLE.DOCTOR
        ? 'text-emerald-400'
        : role === ROLE.DETECTIVE
          ? 'text-sky-400'
          : 'text-slate-100';
  const blurb =
    role === ROLE.MAFIA
      ? 'Each night, pick a target with the other mafia.'
      : role === ROLE.DOCTOR
        ? 'Each night, pick someone to save from the mafia.'
        : role === ROLE.DETECTIVE
          ? 'Each night, privately learn if someone is mafia.'
          : 'Survive. Vote the mafia out before they outnumber you.';

  const teammates = (self.myMafiaTeammates ?? [])
    .map((id) => lobby.players.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 gap-6">
      <div className="text-sm uppercase tracking-widest text-slate-400">You are</div>
      <div className={`text-5xl font-black ${color}`}>{roleName}</div>
      <div className="text-slate-300 max-w-xs">{blurb}</div>
      {role === ROLE.MAFIA && teammates && (
        <div className="text-sm text-red-400">Your fellow mafia: {teammates}</div>
      )}
      <Countdown endsAt={lobby.phaseEndsAt} className="text-slate-500" />
    </div>
  );
}
