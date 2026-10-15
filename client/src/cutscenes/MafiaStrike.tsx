import { motion } from 'framer-motion';
import { HoodedFigure, DaggerIcon, BloodSplat } from './figures';

export function MafiaStrike({ victimName }: { victimName: string | null }) {
  if (!victimName) {
    return (
      <div className="flex flex-col items-center gap-6 py-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-serif text-xl tracking-wide text-parchment-200/70"
        >
          The town slept in peace.
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="text-6xl animate-slowfloat"
        >
          🏮
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-full flex items-end justify-center h-[260px]">
        {/* Attacker */}
        <motion.div
          initial={{ x: -180, opacity: 0 }}
          animate={{ x: -60, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute left-1/2 bottom-0"
        >
          <HoodedFigure size={160} color="#1a1020" accent="#c03838" />
        </motion.div>
        {/* Victim */}
        <motion.div
          initial={{ x: 180, opacity: 0 }}
          animate={{ x: 60, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute left-1/2 bottom-0"
          style={{ transform: 'translateX(60px)' }}
        >
          <HoodedFigure size={160} color="#1b2740" accent="#7cc0ff" flip />
        </motion.div>

        {/* Dagger arc */}
        <motion.div
          initial={{ opacity: 0, rotate: -60, x: -30, y: -40, scale: 0.6 }}
          animate={{
            opacity: [0, 1, 1, 0],
            rotate: [-60, -40, 20, 60],
            x: [-30, 0, 30, 50],
            y: [-40, -20, 10, 30],
            scale: [0.6, 1, 1, 0.8],
          }}
          transition={{ duration: 1.4, delay: 0.9, times: [0, 0.3, 0.7, 1] }}
          className="absolute left-1/2 top-10"
        >
          <DaggerIcon size={70} />
        </motion.div>

        {/* Flash */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 0.3, delay: 1.7 }}
          className="absolute inset-0 bg-white"
        />

        {/* Blood splat */}
        <motion.div
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 1.8, ease: 'backOut' }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <BloodSplat size={300} />
        </motion.div>

        {/* Victim fade */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 1, 0.1] }}
          transition={{ duration: 1.2, delay: 1.9, times: [0, 0.3, 1] }}
          className="absolute left-1/2 bottom-0"
          style={{ transform: 'translateX(60px)' }}
        >
          <HoodedFigure size={160} color="#1b2740" accent="#7cc0ff" flip />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.3, duration: 0.5 }}
        className="mt-6 text-center space-y-1"
      >
        <div className="text-xs uppercase tracking-[0.3em] text-blood-500/80">Found at dawn</div>
        <motion.div
          initial={{ letterSpacing: '0.6em', opacity: 0.3 }}
          animate={{ letterSpacing: '0.15em', opacity: 1 }}
          transition={{ delay: 2.5, duration: 0.6 }}
          className="font-serif text-3xl font-bold text-parchment-100 relative inline-block"
        >
          {victimName}
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 3.0, duration: 0.5 }}
            className="absolute left-0 right-0 top-1/2 h-[2px] bg-blood-500 origin-left"
          />
        </motion.div>
        <div className="font-display italic text-parchment-200/70 pt-1">
          Lifeless. Cold. Silenced.
        </div>
      </motion.div>
    </div>
  );
}
