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

export function GamePage() {
  const lobby = useGameStore((s) => s.lobby);
  if (!lobby) return null;

  switch (lobby.phase) {
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
      return <div className="text-center text-slate-400">Loading…</div>;
  }
}
