import { ROLE } from '@mafia/shared';
import { useGameStore } from '../store/gameStore';
import { Countdown } from '../components/Countdown';

export function Dawn() {
  const lobby = useGameStore((s) => s.lobby);
  const self = useGameStore((s) => s.self);
  const investigations = useGameStore((s) => s.investigations);
  if (!lobby) return null;

  const roundInv = investigations.find((r) => r.round === lobby.round);
  const isDetective = self?.myRole === ROLE.DETECTIVE;

  return (
    <div className="flex flex-col items-center justify-center text-center py-10 gap-5">
      <div className="text-sm uppercase tracking-widest text-slate-400">Dawn — R{lobby.round}</div>
      <div className="text-xl font-semibold max-w-sm">{lobby.pinnedDawnMessage}</div>
      {isDetective && roundInv && (
        <div className="mt-4 rounded-lg bg-slate-900 border border-slate-800 px-4 py-3 max-w-sm">
          <div className="text-xs text-slate-400 mb-1">Your investigation</div>
          <div>
            {roundInv.targetName} is{' '}
            <span
              className={`font-bold ${roundInv.isMafia ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {roundInv.isMafia ? 'MAFIA' : 'not mafia'}
            </span>
          </div>
        </div>
      )}
      <Countdown endsAt={lobby.phaseEndsAt} className="text-slate-500" />
    </div>
  );
}
