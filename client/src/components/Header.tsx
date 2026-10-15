import { useGameStore } from '../store/gameStore';

export function Header() {
  const connection = useGameStore((s) => s.connection);
  const dotClass =
    connection === 'connected'
      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,160,0.6)]'
      : connection === 'connecting'
        ? 'bg-amber-400'
        : 'bg-blood-500';
  return (
    <header className="w-full border-b border-parchment-300/10 bg-night-950/60 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-screen-sm mx-auto px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-xl">
            🏮
          </span>
          <div className="font-serif font-bold tracking-[0.25em] text-sm">
            <span className="text-blood-500">MAFIA</span>
            <span className="text-parchment-100"> · </span>
            <span className="text-parchment-200">WARS</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-parchment-200/70">
          <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
          <span className="capitalize tracking-widest">{connection}</span>
        </div>
      </div>
    </header>
  );
}
