import { motion } from 'framer-motion';
import { Countdown } from './Countdown';

export function PhaseHeader({
  title,
  subtitle,
  endsAt,
  icon,
}: {
  title: string;
  subtitle?: string;
  endsAt: number | null;
  icon?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between surface px-4 py-3"
    >
      <div className="flex items-center gap-3">
        {icon && <div className="text-2xl">{icon}</div>}
        <div>
          <div className="font-serif text-lg tracking-wide">{title}</div>
          {subtitle && (
            <div className="text-xs text-parchment-200/70 font-display italic">{subtitle}</div>
          )}
        </div>
      </div>
      <Countdown endsAt={endsAt} />
    </motion.div>
  );
}
