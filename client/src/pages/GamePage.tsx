import { AnimatePresence, motion } from 'framer-motion';
import { PHASE } from '@mafia/shared';
import { useGameStore } from '../store/gameStore';
import { RoleReveal } from '../game/RoleReveal';
import { NightMafia } from '../game/NightMafia';
import { NightDoctor } from '../game/NightDoctor';
import { NightDetective } from '../game/NightDetective';
import { Dawn } from '../game/Dawn';
import { Discussion } from '../game/Discussion';
import { Voting } from '../game/Voting';
import { VoteResult } from '../game/VoteResult';
import { EndGame } from '../game/EndGame';
import { PlayerRoster } from '../components/PlayerRoster';

// Phases where the roster strip stays pinned under the main scene.
const ROSTER_PHASES = new Set<string>([
  PHASE.NIGHT_MAFIA,
  PHASE.NIGHT_DOCTOR,
  PHASE.NIGHT_DETECTIVE,
  PHASE.DAWN,
  PHASE.DISCUSSION,
  PHASE.VOTING,
  PHASE.VOTE_TIEBREAK,
  PHASE.VOTE_RESULT,
]);

export function GamePage() {
  const lobby = useGameStore((s) => s.lobby);
  if (!lobby) return null;

  const screen = pickScreen(lobby.phase);
  const showRoster = ROSTER_PHASES.has(lobby.phase);

  return (
    <div className="flex flex-col">
      <AnimatePresence mode="wait">
        <motion.div
          key={lobby.phase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {screen}
        </motion.div>
      </AnimatePresence>
      {showRoster && <PlayerRoster />}
    </div>
  );
}

function pickScreen(phase: string) {
  switch (phase) {
    case PHASE.ROLE_REVEAL:
      return <RoleReveal />;
    case PHASE.NIGHT_MAFIA:
      return <NightMafia />;
    case PHASE.NIGHT_DOCTOR:
      return <NightDoctor />;
    case PHASE.NIGHT_DETECTIVE:
      return <NightDetective />;
    case PHASE.DAWN:
      return <Dawn />;
    case PHASE.DISCUSSION:
      return <Discussion />;
    case PHASE.VOTING:
    case PHASE.VOTE_TIEBREAK:
      return <Voting />;
    case PHASE.VOTE_RESULT:
      return <VoteResult />;
    case PHASE.ENDED:
      return <EndGame />;
    default:
      return <div className="text-center text-parchment-200/50">Loading…</div>;
  }
}
