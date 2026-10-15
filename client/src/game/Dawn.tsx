import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CUTSCENE_DOCTOR_MS,
  CUTSCENE_DETECTIVE_MS,
  CUTSCENE_MAFIA_MS,
  ROLE,
} from '@mafia/shared';
import { useGameStore } from '../store/gameStore';
import { MafiaStrike } from '../cutscenes/MafiaStrike';
import { DoctorResult } from '../cutscenes/DoctorResult';
import { DetectiveReveal } from '../cutscenes/DetectiveReveal';
import { play } from '../audio/sfx';

type Stage = 'mafia' | 'doctor' | 'detective' | 'summary';

export function Dawn() {
  const lobby = useGameStore((s) => s.lobby);
  const self = useGameStore((s) => s.self);
  const investigations = useGameStore((s) => s.investigations);
  const announce = useGameStore((s) => s.lastDawn);
  const [stage, setStage] = useState<Stage>('mafia');
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!announce) return;
    // Fire the cutscene sequence timed to DAWN_SECONDS.
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    setStage('mafia');
    play(announce.deadPlayerName ? 'strike' : 'bell');

    const t1 = window.setTimeout(() => {
      setStage('doctor');
      if (announce.doctorPresent) play(announce.savedThisRound ? 'chime' : 'thud');
    }, CUTSCENE_MAFIA_MS);
    const t2 = window.setTimeout(() => {
      setStage('detective');
      if (self?.myRole === ROLE.DETECTIVE) play('reveal');
    }, CUTSCENE_MAFIA_MS + CUTSCENE_DOCTOR_MS);
    const t3 = window.setTimeout(() => {
      setStage('summary');
      play('horn');
    }, CUTSCENE_MAFIA_MS + CUTSCENE_DOCTOR_MS + CUTSCENE_DETECTIVE_MS);
    timers.current.push(t1, t2, t3);
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current = [];
    };
  }, [announce, self?.myRole]);

  if (!lobby) return null;
  const roundInv = investigations.find((r) => r.round === lobby.round);
  const isDetective = self?.myRole === ROLE.DETECTIVE;
  const detectiveAlive = !self?.isSpectator && isDetective;

  return (
    <div className="flex flex-col items-center justify-start py-6 min-h-[480px]">
      <motion.div
        key={`r-${lobby.round}`}
        initial={{ opacity: 0, letterSpacing: '0.6em' }}
        animate={{ opacity: 1, letterSpacing: '0.3em' }}
        className="text-xs uppercase tracking-[0.3em] text-gold-400 mb-6"
      >
        Dawn — Round {lobby.round}
      </motion.div>

      <StageIndicator stage={stage} />

      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="w-full mt-6"
        >
          {stage === 'mafia' && (
            <MafiaStrike victimName={announce?.deadPlayerName ?? null} />
          )}
          {stage === 'doctor' && announce && (
            <DoctorResult
              doctorPresent={announce.doctorPresent}
              saved={announce.savedThisRound}
            />
          )}
          {stage === 'detective' && (
            detectiveAlive && roundInv ? (
              <DetectiveReveal targetName={roundInv.targetName} isMafia={roundInv.isMafia} />
            ) : (
              <PublicDetectiveFiller present={!!roundInv} />
            )
          )}
          {stage === 'summary' && (
            <Summary message={announce?.text ?? ''} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StageIndicator({ stage }: { stage: Stage }) {
  const order: Stage[] = ['mafia', 'doctor', 'detective', 'summary'];
  return (
    <div className="flex items-center gap-2">
      {order.map((s, i) => {
        const active = s === stage;
        const past = order.indexOf(stage) > i;
        return (
          <div
            key={s}
            className={`h-1 rounded-full transition-all ${
              active ? 'w-8 bg-gold-500' : past ? 'w-4 bg-gold-500/40' : 'w-4 bg-parchment-300/15'
            }`}
          />
        );
      })}
    </div>
  );
}

function PublicDetectiveFiller({ present }: { present: boolean }) {
  return (
    <div className="text-center py-10 font-display italic text-parchment-200/60">
      {present
        ? 'A watcher moved through the shadows tonight.'
        : 'No eyes watched the halls tonight.'}
    </div>
  );
}

function Summary({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-10"
    >
      <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-gold-400 to-gold-600 shadow-goldglow flex items-center justify-center text-5xl mb-6">
        ☀
      </div>
      <div className="font-serif text-xl text-parchment-100 max-w-md mx-auto">{message}</div>
      <div className="font-display italic text-parchment-200/60 mt-2 text-sm">
        The town rises to debate.
      </div>
    </motion.div>
  );
}
