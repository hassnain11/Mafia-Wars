import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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

  if (big) {
    return (
      <motion.span
        key={seconds}
        initial={{ scale: 1.4, opacity: 0.3, color: '#c03838' }}
        animate={{ scale: 1, opacity: 1, color: '#f3c969' }}
        transition={{ duration: 0.4 }}
        className={`font-serif tabular-nums text-3xl font-bold ${className ?? ''}`}
      >
        {label}
      </motion.span>
    );
  }

  return (
    <span className={`font-serif tabular-nums text-xl text-parchment-200 ${className ?? ''}`}>
      {label}
    </span>
  );
}

function diff(endsAt: number | null): number {
  if (endsAt === null) return 0;
  return Math.max(0, endsAt - Date.now());
}
