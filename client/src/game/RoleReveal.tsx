import { motion } from 'framer-motion';
import { ROLE } from '@mafia/shared';
import { useGameStore } from '../store/gameStore';
import { Countdown } from '../components/Countdown';
import { CharacterSprite } from '../components/CharacterSprite';
import { ROLE_META } from '../components/RoleSeal';

export function RoleReveal() {
  const self = useGameStore((s) => s.self);
  const lobby = useGameStore((s) => s.lobby);
  if (!self || !lobby) return null;

  const role = self.myRole;
  const meta = role ? ROLE_META[role] : null;

  const teammates = (self.myMafiaTeammates ?? [])
    .map((id) => lobby.players.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <div className="flex flex-col items-center justify-center text-center py-6 gap-5">
      <motion.div
        initial={{ opacity: 0, letterSpacing: '0.5em' }}
        animate={{ opacity: 1, letterSpacing: '0.3em' }}
        transition={{ duration: 0.8 }}
        className="text-xs uppercase tracking-[0.3em] text-parchment-200/70"
      >
        Your fate is sealed
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.1 }}
        className="relative"
      >
        {role && (
          <>
            <div
              className="absolute inset-0 blur-3xl opacity-50"
              style={{ background: `radial-gradient(circle, ${meta?.color ?? '#f3c969'} 0%, transparent 60%)` }}
            />
            <CharacterSprite role={role} size="xl" highlighted />
          </>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <div
          className="font-serif text-4xl font-black uppercase tracking-[0.3em]"
          style={{ color: meta?.color ?? '#f6ecd3' }}
        >
          {meta?.label ?? 'Unknown'}
        </div>
        <div className="font-display italic text-parchment-200/80 mt-2 max-w-xs mx-auto">
          {meta?.description}
        </div>
      </motion.div>

      {role === ROLE.MAFIA && teammates && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.4 }}
          className="chip !text-blood-500 !border-blood-500/40 !bg-blood-500/10"
        >
          With you: {teammates}
        </motion.div>
      )}

      <Countdown endsAt={lobby.phaseEndsAt} className="text-parchment-200/50" />
    </div>
  );
}
