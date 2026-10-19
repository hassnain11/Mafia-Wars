import { motion, AnimatePresence } from 'framer-motion';
import { EV, ROLE } from '@mafia/shared';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';
import { PhaseHeader } from '../components/PhaseHeader';
import { SpectatorBanner } from '../components/SpectatorBanner';
import { Card } from '../components/ui';
import { CharacterSprite } from '../components/CharacterSprite';

export function NightMafia() {
  const lobby = useGameStore((s) => s.lobby);
  const self = useGameStore((s) => s.self);
  const pid = useGameStore((s) => s.playerId);
  if (!lobby || !self || !pid) return null;

  const me = lobby.players.find((p) => p.id === pid);
  const isMafia = self.myRole === ROLE.MAFIA;
  const canAct = isMafia && me?.alive;

  if (self.isSpectator) {
    return (
      <div className="flex flex-col gap-4">
        <PhaseHeader title="Night" subtitle="The mafia stir" endsAt={lobby.phaseEndsAt} icon="🌙" />
        <SpectatorBanner round={lobby.round} />
        <Waiting text="The mafia are choosing their target…" />
      </div>
    );
  }

  if (!canAct) {
    return (
      <div className="flex flex-col gap-4">
        <PhaseHeader
          title="Night falls"
          subtitle="Shadows move in the dark"
          endsAt={lobby.phaseEndsAt}
          icon="🌙"
        />
        <Waiting text="The mafia are choosing their target…" />
      </div>
    );
  }

  const mafiaIds = new Set([pid, ...(self.myMafiaTeammates ?? [])]);
  const picks = (lobby.mafiaPicks ?? {}) as Record<string, string>;
  const targets = lobby.players.filter((p) => p.alive && !mafiaIds.has(p.id));
  const myPick = picks[pid];

  function pick(targetId: string) {
    socket.emit(EV.NIGHT_MAFIA_PICK, { targetId });
  }

  const mafiaNames = lobby.players
    .filter((p) => mafiaIds.has(p.id))
    .map((p) => (p.id === pid ? `${p.name} (you)` : p.name))
    .join(', ');

  return (
    <div className="flex flex-col gap-4">
      <PhaseHeader
        title="Choose your prey"
        subtitle={`With you: ${mafiaNames}`}
        endsAt={lobby.phaseEndsAt}
        icon="🗡"
      />
      <Card>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
          {targets.map((t) => {
            const selected = myPick === t.id;
            const chosenBy = Object.entries(picks)
              .filter(([, v]) => v === t.id)
              .map(([k]) => lobby.players.find((p) => p.id === k)?.name)
              .filter(Boolean);
            return (
              <motion.button
                key={t.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => pick(t.id)}
                className={`flex flex-col items-center gap-2 p-2 rounded-lg transition ${
                  selected
                    ? 'bg-blood-500/20 ring-1 ring-blood-500/60 shadow-bloodglow'
                    : 'hover:bg-night-700/40'
                }`}
              >
                <CharacterSprite
                  role={ROLE.CIVILIAN}
                  size="md"
                  highlighted={selected}
                />
                <div className="text-xs text-parchment-200/90 truncate max-w-full">{t.name}</div>
                <AnimatePresence>
                  {chosenBy.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] text-blood-500/80"
                    >
                      × {chosenBy.length}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <Card className="text-center py-10">
      <div className="text-6xl mb-4 animate-slowfloat">🌙</div>
      <div className="font-display italic text-parchment-200/70">{text}</div>
    </Card>
  );
}
