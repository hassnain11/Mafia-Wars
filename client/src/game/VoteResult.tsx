import { useEffect, useState } from 'react';
import { EV } from '@mafia/shared';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';
import { Countdown } from '../components/Countdown';

export function VoteResult() {
  const lobby = useGameStore((s) => s.lobby);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const handler = (p: { text: string }) => setMsg(p.text);
    socket.on(EV.VOTE_RESULT, handler);
    return () => {
      socket.off(EV.VOTE_RESULT, handler);
    };
  }, []);

  if (!lobby) return null;

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 gap-5">
      <div className="text-sm uppercase tracking-widest text-slate-400">Vote result</div>
      <div className="text-xl font-semibold max-w-sm">{msg ?? '…'}</div>
      <Countdown endsAt={lobby.phaseEndsAt} className="text-slate-500" />
    </div>
  );
}
