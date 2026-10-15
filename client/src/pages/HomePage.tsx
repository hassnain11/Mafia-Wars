import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  EV,
  LOBBY_CODE_LENGTH,
  NAME_MAX,
  type MatchFoundPayload,
  type QueueUpdatePayload,
} from '@mafia/shared';
import { emitAck, socket } from '../socket';
import { persistSession, useGameStore } from '../store/gameStore';
import { pushToast } from '../components/Toast';
import { Button, Card, Chip } from '../components/ui';
import { Bot, Zap, Users, UserPlus, ArrowLeft, X } from 'lucide-react';

type Mode = 'menu' | 'join' | 'queue';

export function HomePage() {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Mode>('menu');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [queueInfo, setQueueInfo] = useState<{ position: number; needed: number } | null>(null);
  const connection = useGameStore((s) => s.connection);
  const setPlayerId = useGameStore((s) => s.setPlayerId);
  const nav = useNavigate();

  useEffect(() => {
    const onMatchFound = (p: MatchFoundPayload) => {
      setPlayerId(p.playerId);
      persistSession(p.playerId, p.code);
      setMode('menu');
      setQueueInfo(null);
      nav(`/lobby/${p.code}`);
    };
    const onQueueUpdate = (p: QueueUpdatePayload) => setQueueInfo(p);
    socket.on(EV.MATCH_FOUND, onMatchFound);
    socket.on(EV.QUEUE_UPDATE, onQueueUpdate);
    return () => {
      socket.off(EV.MATCH_FOUND, onMatchFound);
      socket.off(EV.QUEUE_UPDATE, onQueueUpdate);
    };
  }, [nav, setPlayerId]);

  function requireName(): string | null {
    const t = name.trim();
    if (!t) {
      pushToast('Enter your name first.', 'warn');
      return null;
    }
    if (connection !== 'connected') {
      pushToast('Still connecting…', 'warn');
      return null;
    }
    return t;
  }

  async function onCreate() {
    const n = requireName();
    if (!n) return;
    setBusy(true);
    try {
      const res = await emitAck<{ code: string; playerId: string }>(EV.CREATE_LOBBY, { name: n });
      setPlayerId(res.playerId);
      persistSession(res.playerId, res.code);
      nav(`/lobby/${res.code}`);
    } catch (e) {
      pushToast((e as { message?: string })?.message ?? 'Failed to create lobby', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function onJoin() {
    const n = requireName();
    const codeUp = code.trim().toUpperCase();
    if (!n) return;
    if (codeUp.length !== LOBBY_CODE_LENGTH) {
      return pushToast(`Code must be ${LOBBY_CODE_LENGTH} characters.`, 'warn');
    }
    setBusy(true);
    try {
      const res = await emitAck<{ playerId: string }>(EV.JOIN_LOBBY, { name: n, code: codeUp });
      setPlayerId(res.playerId);
      persistSession(res.playerId, codeUp);
      nav(`/lobby/${codeUp}`);
    } catch (e) {
      pushToast((e as { message?: string })?.message ?? 'Failed to join lobby', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function onPlayWithBots() {
    const n = requireName();
    if (!n) return;
    setBusy(true);
    try {
      const res = await emitAck<{ code: string; playerId: string }>(EV.CREATE_BOT_LOBBY, {
        name: n,
        botCount: 9,
      });
      setPlayerId(res.playerId);
      persistSession(res.playerId, res.code);
      nav(`/lobby/${res.code}`);
    } catch (e) {
      pushToast((e as { message?: string })?.message ?? 'Could not start bot game', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function onQuickMatch() {
    const n = requireName();
    if (!n) return;
    setBusy(true);
    try {
      const res = await emitAck<{ queued: true; position: number; needed: number }>(
        EV.QUICK_MATCH,
        { name: n },
      );
      setQueueInfo({ position: res.position, needed: res.needed });
      setMode('queue');
    } catch (e) {
      pushToast((e as { message?: string })?.message ?? 'Could not join queue', 'error');
    } finally {
      setBusy(false);
    }
  }

  function cancelQueue() {
    socket.emit(EV.LEAVE_QUEUE, {});
    setMode('menu');
    setQueueInfo(null);
  }

  return (
    <div className="flex flex-col gap-7 pt-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-2 pt-6"
      >
        <Chip>Social Deduction</Chip>
        <h1 className="font-serif text-5xl font-bold tracking-wide">
          <span className="text-blood-500 drop-shadow-[0_0_12px_rgba(192,56,56,0.4)]">Mafia</span>{' '}
          <span className="text-parchment-100">Wars</span>
        </h1>
        <p className="font-display italic text-parchment-200/80 text-lg">
          Deceive. Deduce. Survive the night.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {mode === 'queue' ? (
          <motion.div
            key="queue"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="text-center space-y-5 py-10" gold>
              <div className="text-xs tracking-[0.3em] uppercase text-parchment-200/70">
                Searching the shadows
              </div>
              <div className="relative inline-block">
                <motion.div
                  className="w-24 h-24 rounded-full border-2 border-gold-500/40"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-0 flex items-center justify-center font-serif text-4xl text-gold-400">
                  {queueInfo ? 5 - queueInfo.needed : 0}
                  <span className="text-parchment-300/50 text-xl">/5</span>
                </div>
              </div>
              <div className="text-sm text-parchment-200/80">
                {queueInfo?.needed
                  ? `Waiting for ${queueInfo.needed} more soul${queueInfo.needed === 1 ? '' : 's'}…`
                  : 'A match is ready…'}
              </div>
              <Button variant="ghost" onClick={cancelQueue} icon={<X size={16} />} fullWidth>
                Cancel
              </Button>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <Card>
              <label className="block text-xs tracking-[0.2em] uppercase text-parchment-200/70 mb-2">
                Your name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={NAME_MAX}
                placeholder="e.g. Hassnain"
                className="w-full bg-night-900/70 border border-parchment-300/15 rounded-lg px-3 py-2.5 outline-none focus:border-gold-500/60 focus:shadow-glow transition font-serif text-lg"
              />
              {mode === 'join' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <label className="block text-xs tracking-[0.2em] uppercase text-parchment-200/70 mb-2">
                    Lobby code
                  </label>
                  <input
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.toUpperCase().slice(0, LOBBY_CODE_LENGTH))
                    }
                    placeholder="ABC123"
                    className="w-full bg-night-900/70 border border-parchment-300/15 rounded-lg px-3 py-2.5 outline-none focus:border-gold-500/60 focus:shadow-glow transition font-mono text-xl tracking-[0.4em] text-center uppercase"
                  />
                </motion.div>
              )}
            </Card>

            {mode === 'menu' ? (
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={onPlayWithBots}
                  icon={<Bot size={18} />}
                  fullWidth
                >
                  Play with Bots
                </Button>
                <Button
                  variant="gold"
                  disabled={busy}
                  onClick={onQuickMatch}
                  icon={<Zap size={18} />}
                  fullWidth
                >
                  Quick Match
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={onCreate}
                    icon={<Users size={16} />}
                    fullWidth
                  >
                    Create
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setMode('join')}
                    icon={<UserPlus size={16} />}
                    fullWidth
                  >
                    Join
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                <Button variant="primary" disabled={busy} onClick={onJoin} fullWidth>
                  Enter the Lobby
                </Button>
                <button
                  onClick={() => setMode('menu')}
                  className="text-sm text-parchment-200/60 hover:text-parchment-100 py-2 flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              </div>
            )}

            <div className="text-xs text-parchment-200/50 text-center font-display italic">
              Each night the mafia hunts. Each dawn the town accuses.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
