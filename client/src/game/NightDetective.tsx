import { useState } from 'react';
import { motion } from 'framer-motion';
import { EV, ROLE } from '@mafia/shared';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';
import { PhaseHeader } from '../components/PhaseHeader';
import { SpectatorBanner } from '../components/SpectatorBanner';
import { Button, Card } from '../components/ui';
import { CharacterSprite } from '../components/CharacterSprite';

export function NightDetective() {
  const lobby = useGameStore((s) => s.lobby);
  const self = useGameStore((s) => s.self);
  const pid = useGameStore((s) => s.playerId);
  const investigations = useGameStore((s) => s.investigations);
  const [pick, setPick] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  if (!lobby || !self || !pid) return null;

  const me = lobby.players.find((p) => p.id === pid);
  const isDetective = self.myRole === ROLE.DETECTIVE;
  const canAct = isDetective && me?.alive;

  if (!canAct) {
    return (
      <div className="flex flex-col gap-4">
        <PhaseHeader title="Night" subtitle="Shadows observed" endsAt={lobby.phaseEndsAt} icon="🔍" />
        {self.isSpectator && <SpectatorBanner round={lobby.round} />}
        <Waiting text="The detective is investigating…" />
      </div>
    );
  }

  const targets = lobby.players.filter((p) => p.alive && p.id !== pid);

  function submit() {
    if (!pick) return;
    socket.emit(EV.NIGHT_DETECTIVE_INVESTIGATE, { targetId: pick });
    setSent(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <PhaseHeader
        title="Investigate"
        subtitle="You alone will know the truth."
        endsAt={lobby.phaseEndsAt}
        icon="🔍"
      />
      <Card>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
          {targets.map((t) => {
            const selected = pick === t.id;
            return (
              <motion.button
                key={t.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={sent}
                onClick={() => setPick(t.id)}
                className={`flex flex-col items-center gap-2 p-2 rounded-lg transition disabled:opacity-60 ${
                  selected
                    ? 'bg-sky-500/15 ring-1 ring-sky-400/60 shadow-glow'
                    : 'hover:bg-night-700/40'
                }`}
              >
                <CharacterSprite
                  role={ROLE.CIVILIAN}
                  size="md"
                  highlighted={selected}
                />
                <div className="text-xs text-parchment-200/90 truncate max-w-full">{t.name}</div>
              </motion.button>
            );
          })}
        </div>
      </Card>
      <Button variant="primary" disabled={!pick || sent} onClick={submit} fullWidth>
        {sent ? 'Investigation sent' : 'Confirm investigation'}
      </Button>

      {investigations.length > 0 && (
        <Card>
          <div className="text-xs uppercase tracking-[0.2em] text-parchment-200/60 mb-2">
            Casefile
          </div>
          <div className="space-y-1">
            {investigations.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-parchment-200/80 font-display">
                  R{r.round} · {r.targetName}
                </span>
                <span
                  className={`font-serif text-xs tracking-widest uppercase ${
                    r.isMafia ? 'text-blood-500' : 'text-emerald-400'
                  }`}
                >
                  {r.isMafia ? 'Mafia' : 'Not mafia'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <Card className="text-center py-10">
      <div className="text-6xl mb-4 animate-slowfloat">🔍</div>
      <div className="font-display italic text-parchment-200/70">{text}</div>
    </Card>
  );
}
