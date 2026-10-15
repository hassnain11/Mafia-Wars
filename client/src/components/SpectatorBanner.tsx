export function SpectatorBanner({ round }: { round: number }) {
  return (
    <div className="w-full rounded-lg bg-night-800/70 border border-parchment-300/10 px-3 py-2 text-xs text-parchment-200/70 text-center font-display italic">
      👁 Spectating — you fell in round {round}.
    </div>
  );
}
