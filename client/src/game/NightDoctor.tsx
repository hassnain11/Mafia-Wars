import { useState } from 'react';
import { motion } from 'framer-motion';
import { EV, ROLE } from '@mafia/shared';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';
import { PhaseHeader } from '../components/PhaseHeader';
import { SpectatorBanner } from '../components/SpectatorBanner';
import { Button, Card } from '../components/ui';
import { CharacterSprite } from '../components/CharacterSprite';

export function NightDoctor() {
  const lobby = useGameStore((s) => s.lobby);
  const self = useGameStore((s) => s.self);
  const pid = useGameStore((s) => s.playerId);
  const [pick, setPick] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  if (!lobby || !self || !pid) return null;

  const me = lobby.players.find((p) => p.id === pid);
  const isDoctor = self.myRole === ROLE.DOCTOR;
  const canAct = isDoctor && me?.alive;

  if (!canAct) {
    return (
      <div className="flex flex-col gap-4">
        <PhaseHeader title="Night" subtitle="A healer walks the halls" endsAt={lobby.phaseEndsAt} icon="🩺" />
        {self.isSpectator && <SpectatorBanner round={lobby.round} />}
        <Waiting text="The doctor is making their rounds…" />
      </div>
    );
  }

  const living = lobby.players.filter((p) => p.alive);

  function submit() {
    if (!pick) return;
    socket.emit(EV.NIGHT_DOCTOR_PICK, { targetId: pick });
    setSent(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <PhaseHeader
        title="Save a soul"
        subtitle="Pick one to protect from the night."
        endsAt={lobby.phaseEndsAt}
        icon="🩺"
      />
      <Card>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
          {living.map((t) => {
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
                    ? 'bg-emerald-500/15 ring-1 ring-emerald-500/60 shadow-glow'
                    : 'hover:bg-night-700/40'
                }`}
              >
                <CharacterSprite
                  role={t.id === pid ? ROLE.DOCTOR : ROLE.CIVILIAN}
                  size="md"
                  highlighted={selected}
                />
                <div className="text-xs text-parchment-200/90 truncate max-w-full">
                  {t.name}
                  {t.id === pid && <span className="text-parchment-200/50"> (self)</span>}
                </div>
              </motion.button>
            );
          })}
        </div>
      </Card>
      <Button
        variant="primary"
        disabled={!pick || sent}
        onClick={submit}
        fullWidth
      >
        {sent ? 'Blessing sealed' : 'Confirm save'}
      </Button>
    </div>
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <Card className="text-center py-10">
      <div className="text-6xl mb-4 animate-slowfloat">🕯</div>
      <div className="font-display italic text-parchment-200/70">{text}</div>
    </Card>
  );
}
