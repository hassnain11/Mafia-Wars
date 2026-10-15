import { motion } from 'framer-motion';
import { HoodedFigure, MagnifierIcon } from './figures';

export function DetectiveReveal({
  targetName,
  isMafia,
}: {
  targetName: string;
  isMafia: boolean;
}) {
  const color = isMafia ? '#c03838' : '#34d1a0';
  const verdict = isMafia ? 'A Traitor among us.' : 'An honest soul.';

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative h-[220px] w-full flex items-end justify-center">
        {/* Detective silhouette */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <HoodedFigure size={160} color="#0f1a2b" accent="#7cc0ff" />
        </motion.div>

        {/* Magnifier swings in from the side */}
        <motion.div
          initial={{ opacity: 0, x: -60, rotate: -40 }}
          animate={{ opacity: 1, x: 10, rotate: 0 }}
          transition={{ delay: 0.6, duration: 0.6, ease: 'easeOut' }}
          className="absolute left-1/2 top-10"
        >
          <MagnifierIcon size={110} />
        </motion.div>

        {/* Verdict stamp over the lens */}
        <motion.div
          initial={{ opacity: 0, scale: 2, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: -8 }}
          transition={{ delay: 1.3, type: 'spring', stiffness: 220, damping: 14 }}
          className="absolute left-1/2 top-14 -translate-x-1/2"
        >
          <div
            className="px-5 py-2 border-4 font-serif font-black tracking-[0.3em] text-xl uppercase"
            style={{
              borderColor: color,
              color,
              boxShadow: `0 0 20px ${color}60`,
              background: 'rgba(6,8,15,0.65)',
            }}
          >
            {isMafia ? 'Mafia' : 'Innocent'}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.5 }}
        className="mt-4 text-center space-y-1"
      >
        <div className="text-xs uppercase tracking-[0.3em] text-sky-400/80">For your eyes only</div>
        <div className="font-serif text-2xl font-bold text-parchment-100">
          {targetName}
        </div>
        <div className="font-display italic" style={{ color }}>
          {verdict}
        </div>
      </motion.div>
    </div>
  );
}
