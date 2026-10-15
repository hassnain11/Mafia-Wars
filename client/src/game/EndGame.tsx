import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { EV, WINNER, type GameEndedPayload } from '@mafia/shared';
import { useGameStore, clearPersistedSession } from '../store/gameStore';
import { socket } from '../socket';
import { Button, Card, Medallion } from '../components/ui';
import { ROLE_META } from '../components/RoleSeal';
import { LogOut, RotateCcw } from 'lucide-react';

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
  const isMafiaWin = winner === WINNER.MAFIA;
  const banner = isMafiaWin ? 'The Mafia Prevail' : 'The Town Triumphs';
  const subtitle = isMafiaWin
    ? 'Deceit buried the truth. The night belongs to them.'
    : 'The town saw through the lies. The traitors are undone.';

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
    <div className="flex flex-col gap-5 py-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 16 }}
        className="text-center space-y-2 py-6"
      >
        <div className="text-xs uppercase tracking-[0.3em] text-parchment-200/60">Game over</div>
        <div
          className={`font-serif text-4xl font-black tracking-wide drop-shadow-[0_0_18px_rgba(243,201,105,0.3)] ${
            isMafiaWin ? 'text-blood-500' : 'text-emerald-400'
          }`}
        >
          🏆 {banner}
        </div>
        <div className="font-display italic text-parchment-200/70 max-w-md mx-auto">
          {subtitle}
        </div>
      </motion.div>

      <Card gold>
        <div className="text-xs uppercase tracking-[0.3em] text-parchment-200/60 mb-3">
          Final roles revealed
        </div>
        <ul className="divide-y divide-parchment-300/8">
          {(result?.fullReveal ?? []).map((p, i) => {
            const meta = ROLE_META[p.role];
            return (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="py-2 flex items-center gap-3"
              >
                <Medallion name={p.name} size="sm" alive={p.alive} roleColor={meta.color} />
                <div className="flex-1">
                  <div className="font-serif tracking-wide">{p.name}</div>
                </div>
                <div
                  className="font-serif text-xs tracking-[0.2em] uppercase"
                  style={{ color: meta.color }}
                >
                  {meta.label}
                </div>
                <span className={`text-sm ${p.alive ? 'text-emerald-400' : 'text-parchment-200/40'}`}>
                  {p.alive ? '✓' : '💀'}
                </span>
              </motion.li>
            );
          })}
        </ul>
      </Card>

      {isHost ? (
        <Button variant="primary" onClick={backToLobby} icon={<RotateCcw size={16} />} fullWidth>
          Another round
        </Button>
      ) : (
        <div className="surface px-4 py-3 text-center text-parchment-200/70 italic">
          Waiting for the host…
        </div>
      )}
      <Button variant="ghost" onClick={leave} icon={<LogOut size={14} />} fullWidth>
        Leave
      </Button>
    </div>
  );
}
