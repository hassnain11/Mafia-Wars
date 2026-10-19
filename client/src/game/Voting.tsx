import { motion } from 'framer-motion';
import { EV, PHASE } from '@mafia/shared';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';
import { PhaseHeader } from '../components/PhaseHeader';
import { SpectatorBanner } from '../components/SpectatorBanner';
import { Card } from '../components/ui';
import { CharacterSprite } from '../components/CharacterSprite';
import { displayRoleFor } from '../lib/roleView';

export function Voting() {
  const lobby = useGameStore((s) => s.lobby);
  const self = useGameStore((s) => s.self);
  const pid = useGameStore((s) => s.playerId);
  if (!lobby || !self || !pid) return null;

  const me = lobby.players.find((p) => p.id === pid);
  const isTiebreak = lobby.phase === PHASE.VOTE_TIEBREAK;
  const canVote = me?.alive && !self.isSpectator;
  const liveVotes = (lobby.liveVotes ?? {}) as Record<string, string | 'skip'>;
  const myVote = liveVotes[pid];
  const totalVoters = lobby.players.filter((p) => p.alive).length;

  const candidateIds = isTiebreak
    ? lobby.tiebreakCandidates ?? []
    : lobby.players.filter((p) => p.alive && p.id !== pid).map((p) => p.id);
  const candidates = candidateIds
    .map((id) => lobby.players.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p && p.alive && p.id !== pid);

  function countFor(id: string | 'skip') {
    return Object.values(liveVotes).filter((v) => v === id).length;
  }

  function vote(target: string | 'skip') {
    if (!canVote) return;
    socket.emit(EV.CAST_VOTE, { targetId: target });
  }

  const title = isTiebreak ? 'Tie-break' : 'The Verdict';
  const subtitle = isTiebreak
    ? 'The town is split. Choose again.'
    : 'Point your finger. One name must fall.';

  return (
    <div className="flex flex-col gap-4">
      <PhaseHeader title={title} subtitle={subtitle} endsAt={lobby.phaseEndsAt} icon="⚖" />
      {self.isSpectator && <SpectatorBanner round={lobby.round} />}
      <Card className="!p-0">
        <ul>
          {candidates.map((c) => {
            const n = countFor(c.id);
            const pct = totalVoters ? n / totalVoters : 0;
            const selected = myVote === c.id;
            return (
              <li
                key={c.id}
                className="relative border-b border-parchment-300/5 last:border-none"
              >
                <motion.div
                  className="vote-bar"
                  animate={{ scaleX: pct }}
                  transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                />
                <button
                  disabled={!canVote}
                  onClick={() => vote(c.id)}
                  className={`relative w-full flex items-center gap-3 px-4 py-3 text-left disabled:opacity-60 hover:bg-night-700/30 transition ${
                    selected ? 'bg-blood-500/15' : ''
                  }`}
                >
                  <CharacterSprite role={displayRoleFor(self, c.id)} size="sm" />
                  <div className="flex-1">
                    <div className="font-serif tracking-wide">{c.name}</div>
                    <div className="text-xs text-parchment-200/60">
                      {n} vote{n === 1 ? '' : 's'}
                      {selected && <span className="text-blood-500 ml-2">· your vote</span>}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
          {!isTiebreak && (
            <li className="relative">
              <motion.div
                className="vote-bar"
                style={{ background: 'linear-gradient(90deg, rgba(188,212,255,0.15), transparent)' }}
                animate={{ scaleX: totalVoters ? countFor('skip') / totalVoters : 0 }}
                transition={{ duration: 0.4 }}
              />
              <button
                disabled={!canVote}
                onClick={() => vote('skip')}
                className={`relative w-full flex items-center justify-between px-4 py-3 disabled:opacity-60 hover:bg-night-700/30 transition ${
                  myVote === 'skip' ? 'bg-night-700/60' : ''
                }`}
              >
                <span className="text-parchment-200/70 font-display italic">Skip the vote</span>
                <span className="text-xs text-parchment-200/60">
                  {countFor('skip')} vote{countFor('skip') === 1 ? '' : 's'}
                </span>
              </button>
            </li>
          )}
        </ul>
      </Card>
      <div className="surface px-3 py-2 text-xs text-parchment-200/60 text-center italic">
        The hall has fallen silent. Chat is closed.
      </div>
    </div>
  );
}
