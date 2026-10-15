import { useState } from 'react';
import { EV, ROLE } from '@mafia/shared';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';
import { PhaseHeader } from '../components/PhaseHeader';
import { SpectatorBanner } from '../components/SpectatorBanner';

export function NightDetective() {
  const lobby = useGameStore((s) => s.lobby);
  const self = useGameStore((s) => s.self);
  const pid = useGameStore((s) => s.playerId);
  const investigations = useGameStore((s) => s.investigations);
  const [pick, setPick] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  if (!lobby || !self || !pid) return null;

  const me = lobby.players.find((p) => p.id === pid);
  const isDetective = self.myRole === ROLE.DETECTIVE;
  const canAct = isDetective && me?.alive;

  if (self.isSpectator) {
    return (
      <div className="flex flex-col gap-4">
        <PhaseHeader title="🌙 Night" endsAt={lobby.phaseEndsAt} />
        <SpectatorBanner round={lobby.round} />
        <WaitingNote text="The detective is investigating…" />
      </div>
    );
  }

  if (!canAct) {
    return (
      <div className="flex flex-col gap-4">
        <PhaseHeader title="🌙 Night" endsAt={lobby.phaseEndsAt} />
        <WaitingNote text="The detective is investigating…" />
      </div>
    );
  }

  const targets = lobby.players.filter((p) => p.alive && p.id !== pid);

  function submit() {
    if (!pick) return;
    socket.emit(EV.NIGHT_DETECTIVE_INVESTIGATE, { targetId: pick });
    setSent(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <PhaseHeader
        title="🔍 Investigate"
        subtitle="You will privately learn whether they are mafia."
        endsAt={lobby.phaseEndsAt}
      />
      <ul className="divide-y divide-slate-800 rounded-lg bg-slate-900 border border-slate-800">
        {targets.map((t) => {
          const selected = pick === t.id;
          return (
            <li key={t.id}>
              <button
                disabled={sent}
                onClick={() => setPick(t.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800 disabled:opacity-60 ${
                  selected ? 'bg-sky-500/20' : ''
                }`}
              >
                <span>{t.name}</span>
                {selected && <span className="text-xs text-sky-400">chosen</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <button
        disabled={!pick || sent}
        onClick={submit}
        className="w-full rounded-lg bg-sky-500 text-slate-950 py-3 font-semibold disabled:opacity-50"
      >
        {sent ? 'Submitted' : 'Confirm'}
      </button>

      {investigations.length > 0 && (
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 text-sm">
          <div className="text-slate-400 text-xs mb-1">Your investigations</div>
          {investigations.map((r, i) => (
            <div key={i} className="text-slate-300">
              R{r.round}: {r.targetName} —{' '}
              <span className={r.isMafia ? 'text-red-400' : 'text-emerald-400'}>
                {r.isMafia ? 'MAFIA' : 'not mafia'}
              </span>
            </div>
          ))}
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
