import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EV, LOBBY_CODE_LENGTH, NAME_MAX, type MatchFoundPayload, type QueueUpdatePayload } from '@mafia/shared';
import { emitAck, socket } from '../socket';
import { persistSession, useGameStore } from '../store/gameStore';
import { pushToast } from '../components/Toast';
import { Users, Bot, Zap, UserPlus } from 'lucide-react';

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
      pushToast('Enter a name first.', 'warn');
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
    <div className="flex flex-col gap-6">
      <div className="text-center space-y-1 pt-4">
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="text-red-500">Mafia</span> Wars
        </h1>
        <p className="text-slate-400">Deceive. Deduce. Survive.</p>
      </div>

      {mode === 'queue' ? (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 text-center space-y-4">
          <div className="text-sm uppercase tracking-widest text-slate-400">
            Looking for players
          </div>
          <div className="text-4xl font-black">
            {queueInfo ? `${5 - queueInfo.needed}/5` : '…'}
          </div>
          <div className="text-xs text-slate-400">
            {queueInfo?.needed ? `${queueInfo.needed} more needed` : 'Match ready…'}
          </div>
          <button
            onClick={cancelQueue}
            className="mt-2 w-full rounded-lg bg-slate-800 hover:bg-slate-700 py-3 text-sm"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <label className="block text-sm text-slate-300">
            Your name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              placeholder="e.g. Hassnain"
              className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-slate-500"
            />
          </label>

          {mode === 'join' && (
            <label className="block text-sm text-slate-300">
              Lobby code
              <input
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.toUpperCase().slice(0, LOBBY_CODE_LENGTH))
                }
                placeholder="ABC123"
                className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-slate-500 tracking-widest font-mono text-lg"
              />
            </label>
          )}

          {mode === 'menu' && (
            <div className="grid grid-cols-1 gap-3">
              <PrimaryButton disabled={busy} onClick={onPlayWithBots} icon={<Bot size={18} />}>
                Play with Bots
              </PrimaryButton>
              <SecondaryButton disabled={busy} onClick={onQuickMatch} icon={<Zap size={18} />}>
                Quick Match (online)
              </SecondaryButton>
              <SecondaryButton disabled={busy} onClick={onCreate} icon={<Users size={18} />}>
                Create Lobby
              </SecondaryButton>
              <SecondaryButton
                disabled={busy}
                onClick={() => setMode('join')}
                icon={<UserPlus size={18} />}
              >
                Join Lobby
              </SecondaryButton>
            </div>
          )}

          {mode === 'join' && (
            <div className="grid grid-cols-1 gap-3">
              <PrimaryButton disabled={busy} onClick={onJoin}>
                Join
              </PrimaryButton>
              <button
                onClick={() => setMode('menu')}
                className="text-sm text-slate-400 hover:text-slate-200 py-2"
              >
                Back
              </button>
            </div>
          )}

          <div className="text-xs text-slate-500 text-center pt-2">
            Bots play locally. Quick Match pairs you with other online players.
          </div>
        </>
      )}
    </div>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-lg bg-red-500 hover:bg-red-400 disabled:opacity-50 py-3 font-semibold flex items-center justify-center gap-2"
    >
      {icon}
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  disabled,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 py-3 font-semibold flex items-center justify-center gap-2"
    >
      {icon}
      {children}
    </button>
  );
}
