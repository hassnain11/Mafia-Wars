export function SpectatorBanner({ round }: { round: number }) {
  return (
    <div className="w-full rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-2 text-xs text-slate-300 text-center">
      Spectating — you were eliminated in round {round}.
    </div>
  );
}
