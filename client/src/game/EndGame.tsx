import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { EV, WINNER } from '@mafia/shared';
import { useGameStore, clearPersistedSession } from '../store/gameStore';
import { socket } from '../socket';
import { Button, Card, Medallion } from '../components/ui';
import { ROLE_META } from '../components/RoleSeal';
import { play } from '../audio/sfx';
import { LogOut, RotateCcw } from 'lucide-react';

export function EndGame() {
  const lobby = useGameStore((s) => s.lobby);
  const pid = useGameStore((s) => s.playerId);
  const resetGame = useGameStore((s) => s.resetGame);
  const result = useGameStore((s) => s.lastGameEnded);
  const nav = useNavigate();

  useEffect(() => {
    if (!result) return;
    play(result.winner === WINNER.MAFIA ? 'strike' : 'reveal');
    const t1 = setTimeout(() => play('horn'), 400);
    const t2 = setTimeout(() => play('bell'), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [result]);

  if (!lobby) return null;
  const me = lobby.players.find((p) => p.id === pid);
  const isHost = !!me?.isHost;
  const winner = result?.winner;
  const isMafiaWin = winner === WINNER.MAFIA;
  const banner = isMafiaWin ? 'The Mafia Prevail' : 'The Town Triumphs';
  const subtitle = isMafiaWin
    ? 'Deceit buried the truth. The night belongs to them.'
    : 'The town saw through the lies. The traitors are undone.';
  const bannerColor = isMafiaWin ? '#c03838' : '#34d1a0';

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
    <div className="relative flex flex-col gap-5 py-4">
      {result && <Particles winner={isMafiaWin} />}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 150, damping: 14 }}
        className="relative text-center space-y-3 py-10"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs uppercase tracking-[0.4em] text-parchment-200/60"
        >
          Verdict of the realm
        </motion.div>
        <motion.div
          initial={{ letterSpacing: '0.6em', opacity: 0 }}
          animate={{ letterSpacing: '0.08em', opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.9 }}
          className="font-serif text-5xl font-black tracking-wide"
          style={{
            color: bannerColor,
            textShadow: `0 0 30px ${bannerColor}80, 0 0 50px ${bannerColor}40`,
          }}
        >
          {banner}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="font-display italic text-parchment-200/70 max-w-md mx-auto"
        >
          {subtitle}
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
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
                  transition={{ delay: 1.7 + i * 0.08 }}
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
                  <span
                    className={`text-sm ${p.alive ? 'text-emerald-400' : 'text-parchment-200/40'}`}
                  >
                    {p.alive ? '✓' : '💀'}
                  </span>
                </motion.li>
              );
            })}
          </ul>
        </Card>
      </motion.div>

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

function Particles({ winner }: { winner: boolean }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 400,
        y: 100 + Math.random() * 200,
        rot: Math.random() * 360,
        size: 4 + Math.random() * 10,
        delay: Math.random() * 0.6,
      })),
    [],
  );
  const color = winner ? '#c03838' : '#f3c969';
  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden">
      {bits.map((b) => (
        <motion.div
          key={b.id}
          initial={{ y: -30, x: 0, opacity: 0, rotate: 0 }}
          animate={{
            y: [-30, 400],
            x: [0, b.x],
            opacity: [0, 1, 0],
            rotate: b.rot,
          }}
          transition={{ delay: b.delay, duration: 2.4, ease: 'easeOut' }}
          className="absolute top-10"
          style={{
            width: b.size,
            height: b.size,
            background: color,
            borderRadius: '2px',
            boxShadow: `0 0 10px ${color}80`,
          }}
        />
      ))}
    </div>
  );
}
