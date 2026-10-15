import { motion } from 'framer-motion';
import { HoodedFigure, ShieldIcon } from './figures';

export function DoctorResult({
  doctorPresent,
  saved,
}: {
  doctorPresent: boolean;
  saved: boolean;
}) {
  if (!doctorPresent) {
    return (
      <div className="text-center font-display italic text-parchment-200/60 py-8">
        No healer walked the halls tonight.
      </div>
    );
  }

  const message = saved
    ? "The healer's shield held fast."
    : 'The healer arrived too late.';
  const color = saved ? '#34d1a0' : '#9aa6c2';

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative h-[220px] w-full flex items-end justify-center">
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <HoodedFigure size={160} color="#102030" accent={color} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
          animate={
            saved
              ? { opacity: 1, scale: [0.4, 1.2, 1], rotate: 0 }
              : { opacity: [0, 1, 1, 0.3], scale: [0.4, 1, 1, 0.9], rotate: [-20, 0, 10, 40] }
          }
          transition={{ duration: saved ? 1.0 : 1.6, delay: 0.7, times: saved ? undefined : [0, 0.3, 0.6, 1] }}
          className="absolute left-1/2 top-6 -translate-x-1/2"
        >
          <ShieldIcon size={110} color={color} broken={!saved} />
          {saved && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ boxShadow: '0 0 0 rgba(52,209,160,0)' }}
              animate={{
                boxShadow: [
                  '0 0 0 rgba(52,209,160,0)',
                  '0 0 60px rgba(52,209,160,0.6)',
                  '0 0 0 rgba(52,209,160,0)',
                ],
              }}
              transition={{ duration: 1.2, delay: 1.0, repeat: 1 }}
            />
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="mt-4 text-center space-y-1"
      >
        <div className="text-xs uppercase tracking-[0.3em] text-parchment-200/60">
          The Healer
        </div>
        <div
          className="font-serif text-2xl font-bold"
          style={{ color }}
        >
          {message}
        </div>
      </motion.div>
    </div>
  );
}
