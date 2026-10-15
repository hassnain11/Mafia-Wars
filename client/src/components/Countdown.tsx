import { useEffect, useState } from 'react';

export function Countdown({ endsAt, className }: { endsAt: number | null; className?: string }) {
  const [remaining, setRemaining] = useState(() => diff(endsAt));

  useEffect(() => {
    if (endsAt === null) {
      setRemaining(0);
      return;
    }
    let id: number;
    const tick = () => {
      setRemaining(diff(endsAt));
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, [endsAt]);

  if (endsAt === null) return null;
  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  const big = seconds <= 10;
  const label = big
    ? `${seconds}`
    : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return (
    <span
      className={`font-mono tabular-nums ${big ? 'text-3xl font-bold' : 'text-xl'} ${
        className ?? ''
      }`}
      aria-live="off"
    >
      {label}
    </span>
  );
}

function diff(endsAt: number | null): number {
  if (endsAt === null) return 0;
  return Math.max(0, endsAt - Date.now());
}
