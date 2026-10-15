import { useGameStore } from '../store/gameStore';

export function Header() {
  const connection = useGameStore((s) => s.connection);
  const dotClass =
    connection === 'connected'
      ? 'bg-emerald-500'
      : connection === 'connecting'
        ? 'bg-amber-400'
        : 'bg-red-500';
  return (
    <header className="w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur">
      <div className="max-w-screen-sm mx-auto px-4 py-3 flex items-center justify-between">
        <div className="font-semibold tracking-wide">
          <span className="text-red-500">Mafia</span> Wars
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
          <span className="capitalize">{connection}</span>
        </div>
      </div>
    </header>
  );
}
