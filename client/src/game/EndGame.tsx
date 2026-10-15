import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EV, WINNER, type GameEndedPayload } from '@mafia/shared';
import { useGameStore, clearPersistedSession } from '../store/gameStore';
import { socket } from '../socket';

export function EndGame() {
  const lobby = useGameStore((s) => s.lobby);
  const pid = useGameStore((s) => s.playerId);
  const resetGame = useGameStore((s) => s.resetGame);
  const nav = useNavigate();
  const [result, setResult] = useState<GameEndedPayload | null>(null);

  useEffect(() => {
    const handler = (p: GameEndedPayload) => setResult(p);
    socket.on(EV.GAME_ENDED, handler);
    return () => {
      socket.off(EV.GAME_ENDED, handler);
    };
  }, []);

  if (!lobby) return null;
  const me = lobby.players.find((p) => p.id === pid);
  const isHost = !!me?.isHost;
  const winner = result?.winner;
  const banner =
    winner === WINNER.MAFIA
      ? 'MAFIA WIN'
      : winner === WINNER.CIVILIANS
        ? 'CIVILIANS WIN'
        : 'GAME OVER';
  const bannerClass = winner === WINNER.MAFIA ? 'text-red-500' : 'text-emerald-400';

  function backToLobby() {
    socket.emit(EV.RETURN_TO_LOBBY, {});
  }

  function leave() {
    socket.emit(EV.LEAVE_LOBBY, {});
    clearPersistedSession();
    resetGame();
    nav('/', { replace: true });
  }

  return (
    <div className="flex flex-col gap-5 py-6">
      <div className={`text-center text-4xl font-black ${bannerClass}`}>🏆 {banner}</div>
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
        <div className="text-sm text-slate-400 mb-2">Final roles</div>
        <ul className="divide-y divide-slate-800">
          {(result?.fullReveal ?? []).map((p) => (
            <li key={p.id} className="py-2 flex items-center justify-between">
              <span>{p.name}</span>
              <span className="flex items-center gap-2 text-sm">
                <span className="capitalize text-slate-300">{p.role}</span>
                <span className={p.alive ? 'text-emerald-400' : 'text-slate-500'}>
                  {p.alive ? '✓' : '💀'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      {isHost ? (
        <button
          onClick={backToLobby}
          className="w-full rounded-lg bg-red-500 hover:bg-red-400 py-3 font-semibold"
        >
          Back to lobby
        </button>
      ) : (
        <div className="w-full rounded-lg bg-slate-800 py-3 text-center text-slate-300">
          Waiting for host…
        </div>
      )}
      <button
        onClick={leave}
        className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 py-3 text-sm"
      >
        Leave
      </button>
    </div>
  );
}
