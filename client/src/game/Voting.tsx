import { EV, PHASE } from '@mafia/shared';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';
import { PhaseHeader } from '../components/PhaseHeader';
import { SpectatorBanner } from '../components/SpectatorBanner';

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

  const title = isTiebreak ? '⚖ Tie-break' : '🗳 Vote';
  const subtitle = isTiebreak
    ? 'Still undecided. Vote again between the tied players.'
    : 'Who is mafia?';

  return (
    <div className="flex flex-col gap-4">
      <PhaseHeader title={title} subtitle={subtitle} endsAt={lobby.phaseEndsAt} />
      {self.isSpectator && <SpectatorBanner round={lobby.round} />}
      <ul className="divide-y divide-slate-800 rounded-lg bg-slate-900 border border-slate-800">
        {candidates.map((c) => {
          const selected = myVote === c.id;
          return (
            <li key={c.id}>
              <button
                disabled={!canVote}
                onClick={() => vote(c.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800 disabled:opacity-60 ${
                  selected ? 'bg-red-500/20' : ''
                }`}
              >
                <span>{c.name}</span>
                <span className="text-xs text-slate-400">
                  {countFor(c.id)} vote{countFor(c.id) === 1 ? '' : 's'}
                </span>
              </button>
            </li>
          );
        })}
        {!isTiebreak && (
          <li>
            <button
              disabled={!canVote}
              onClick={() => vote('skip')}
              className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800 disabled:opacity-60 ${
                myVote === 'skip' ? 'bg-slate-700' : ''
              }`}
            >
              <span className="text-slate-400">Skip</span>
              <span className="text-xs text-slate-400">
                {countFor('skip')} vote{countFor('skip') === 1 ? '' : 's'}
              </span>
            </button>
          </li>
        )}
      </ul>
      <div className="rounded-lg bg-slate-800/60 border border-slate-700 px-3 py-2 text-xs text-slate-400 text-center">
        Chat is closed — place your vote.
      </div>
    </div>
  );
}
