import { useState } from 'react';
import { EV, ROLE } from '@mafia/shared';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';
import { PhaseHeader } from '../components/PhaseHeader';
import { SpectatorBanner } from '../components/SpectatorBanner';

export function NightDoctor() {
  const lobby = useGameStore((s) => s.lobby);
  const self = useGameStore((s) => s.self);
  const pid = useGameStore((s) => s.playerId);
  const [pick, setPick] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  if (!lobby || !self || !pid) return null;

  const me = lobby.players.find((p) => p.id === pid);
  const isDoctor = self.myRole === ROLE.DOCTOR;
  const canAct = isDoctor && me?.alive;

  if (self.isSpectator) {
    return (
      <div className="flex flex-col gap-4">
        <PhaseHeader title="🌙 Night" endsAt={lobby.phaseEndsAt} />
        <SpectatorBanner round={lobby.round} />
        <WaitingNote text="The doctor is making their rounds…" />
      </div>
    );
  }

  if (!canAct) {
    return (
      <div className="flex flex-col gap-4">
        <PhaseHeader title="🌙 Night" endsAt={lobby.phaseEndsAt} />
        <WaitingNote text="The doctor is making their rounds…" />
      </div>
    );
  }

  const living = lobby.players.filter((p) => p.alive);

  function submit() {
    if (!pick) return;
    socket.emit(EV.NIGHT_DOCTOR_PICK, { targetId: pick });
    setSent(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <PhaseHeader
        title="🩺 Save someone"
        subtitle="Pick one player to protect this round."
        endsAt={lobby.phaseEndsAt}
      />
      <ul className="divide-y divide-slate-800 rounded-lg bg-slate-900 border border-slate-800">
        {living.map((t) => {
          const selected = pick === t.id;
          return (
            <li key={t.id}>
              <button
                disabled={sent}
                onClick={() => setPick(t.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800 disabled:opacity-60 ${
                  selected ? 'bg-emerald-500/20' : ''
                }`}
              >
                <span>
                  {t.name}
                  {t.id === pid && <span className="text-xs text-slate-400 ml-2">(self)</span>}
                </span>
                {selected && <span className="text-xs text-emerald-400">chosen</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <button
        disabled={!pick || sent}
        onClick={submit}
        className="w-full rounded-lg bg-emerald-500 text-slate-950 py-3 font-semibold disabled:opacity-50"
      >
        {sent ? 'Submitted' : 'Confirm Save'}
      </button>
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
