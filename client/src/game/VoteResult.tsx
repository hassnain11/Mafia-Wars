import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { EV } from '@mafia/shared';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';
import { Countdown } from '../components/Countdown';

export function VoteResult() {
  const lobby = useGameStore((s) => s.lobby);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const handler = (p: { text: string }) => setMsg(p.text);
    socket.on(EV.VOTE_RESULT, handler);
    return () => {
      socket.off(EV.VOTE_RESULT, handler);
    };
  }, []);

  if (!lobby) return null;

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 gap-5">
      <motion.div
        initial={{ opacity: 0, letterSpacing: '0.5em' }}
        animate={{ opacity: 1, letterSpacing: '0.3em' }}
        className="text-xs uppercase tracking-[0.3em] text-parchment-200/60"
      >
        The verdict
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 180, damping: 18 }}
        className="font-serif text-2xl max-w-md"
      >
        {msg ?? '…'}
      </motion.div>
      <Countdown endsAt={lobby.phaseEndsAt} className="text-parchment-200/50" />
    </div>
  );
}
