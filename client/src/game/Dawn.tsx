import { motion } from 'framer-motion';
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
    <div className="flex flex-col items-center justify-center text-center py-12 gap-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs uppercase tracking-[0.3em] text-gold-400"
      >
        Dawn — Round {lobby.round}
      </motion.div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className="relative"
      >
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 shadow-goldglow flex items-center justify-center text-5xl">
          ☀
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="font-serif text-2xl max-w-md px-4"
      >
        {lobby.pinnedDawnMessage}
      </motion.div>

      {isDetective && roundInv && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="surface surface-gold px-5 py-3 inline-flex items-center gap-3"
        >
          <span className="text-xs uppercase tracking-widest text-parchment-200/60">
            Your eyes alone
          </span>
          <span>
            {roundInv.targetName} is{' '}
            <span
              className={`font-serif font-bold tracking-widest ${
                roundInv.isMafia ? 'text-blood-500' : 'text-emerald-400'
              }`}
            >
              {roundInv.isMafia ? 'MAFIA' : 'NOT MAFIA'}
            </span>
          </span>
        </motion.div>
      )}

      <Countdown endsAt={lobby.phaseEndsAt} className="text-parchment-200/50" />
    </div>
  );
}
