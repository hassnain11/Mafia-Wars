import { EV, ROLE } from '@mafia/shared';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';
import { PhaseHeader } from '../components/PhaseHeader';
import { SpectatorBanner } from '../components/SpectatorBanner';

export function NightMafia() {
  const lobby = useGameStore((s) => s.lobby);
  const self = useGameStore((s) => s.self);
  const pid = useGameStore((s) => s.playerId);
  if (!lobby || !self || !pid) return null;

  const me = lobby.players.find((p) => p.id === pid);
  const isMafia = self.myRole === ROLE.MAFIA;
  const canAct = isMafia && me?.alive;

  if (self.isSpectator) {
    return (
      <div className="flex flex-col gap-4">
        <PhaseHeader title="🌙 Night" endsAt={lobby.phaseEndsAt} />
        <SpectatorBanner round={lobby.round} />
        <WaitingNote text="The mafia are choosing their target…" />
      </div>
    );
  }

  if (!canAct) {
    return (
      <div className="flex flex-col gap-4">
        <PhaseHeader title="🌙 Night falls" endsAt={lobby.phaseEndsAt} />
        <WaitingNote text="The mafia are choosing their target…" />
      </div>
    );
  }

  const mafiaIds = new Set([pid, ...(self.myMafiaTeammates ?? [])]);
  const picks = (lobby.mafiaPicks ?? {}) as Record<string, string>;
  const targets = lobby.players.filter((p) => p.alive && !mafiaIds.has(p.id));
  const myPick = picks[pid];

  function pick(targetId: string) {
    socket.emit(EV.NIGHT_MAFIA_PICK, { targetId });
  }

  const mafiaNames = lobby.players
    .filter((p) => mafiaIds.has(p.id))
    .map((p) => (p.id === pid ? `${p.name} (you)` : p.name))
    .join(', ');

  return (
    <div className="flex flex-col gap-4">
      <PhaseHeader title="🌙 Night — pick a target" endsAt={lobby.phaseEndsAt} />
      <div className="text-xs text-red-400">Mafia: {mafiaNames}</div>
      <ul className="divide-y divide-slate-800 rounded-lg bg-slate-900 border border-slate-800">
        {targets.map((t) => {
          const selected = myPick === t.id;
          return (
            <li key={t.id}>
              <button
                onClick={() => pick(t.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800 ${
                  selected ? 'bg-red-500/20' : ''
                }`}
              >
                <span>{t.name}</span>
                {selected && <span className="text-xs text-red-400">your pick</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {Object.keys(picks).length > 0 && (
        <div className="rounded-lg bg-slate-900 border border-slate-800 px-4 py-3 text-sm">
          <div className="text-slate-400 text-xs mb-1">Picks so far</div>
          {Object.entries(picks).map(([voter, target]) => {
            const vn = lobby.players.find((p) => p.id === voter)?.name ?? '?';
            const tn = lobby.players.find((p) => p.id === target)?.name ?? '?';
            return (
              <div key={voter} className="text-slate-300">
                {vn} → <span className="text-red-400">{tn}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WaitingNote({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 px-4 py-6 text-center text-slate-400">
      {text}
    </div>
  );
}
