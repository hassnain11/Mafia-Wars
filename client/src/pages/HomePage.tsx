import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EV, LOBBY_CODE_LENGTH, NAME_MAX } from '@mafia/shared';
import { emitAck } from '../socket';
import { persistSession, useGameStore } from '../store/gameStore';
import { pushToast } from '../components/Toast';

export function HomePage() {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'none' | 'join'>('none');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const connection = useGameStore((s) => s.connection);
  const setPlayerId = useGameStore((s) => s.setPlayerId);
  const nav = useNavigate();

  async function onCreate() {
    const trimmed = name.trim();
    if (!trimmed) return pushToast('Enter a name first.', 'warn');
    if (connection !== 'connected') return pushToast('Still connecting…', 'warn');
    setBusy(true);
    try {
      const res = await emitAck<{ code: string; playerId: string }>(EV.CREATE_LOBBY, {
        name: trimmed,
      });
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
    const trimmed = name.trim();
    const codeUp = code.trim().toUpperCase();
    if (!trimmed) return pushToast('Enter a name first.', 'warn');
    if (codeUp.length !== LOBBY_CODE_LENGTH) {
      return pushToast(`Code must be ${LOBBY_CODE_LENGTH} characters.`, 'warn');
    }
    if (connection !== 'connected') return pushToast('Still connecting…', 'warn');
    setBusy(true);
    try {
      const res = await emitAck<{ playerId: string }>(EV.JOIN_LOBBY, {
        name: trimmed,
        code: codeUp,
      });
      setPlayerId(res.playerId);
      persistSession(res.playerId, codeUp);
      nav(`/lobby/${codeUp}`);
    } catch (e) {
      pushToast((e as { message?: string })?.message ?? 'Failed to join lobby', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center space-y-1 pt-6">
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="text-red-500">Mafia</span> Wars
        </h1>
        <p className="text-slate-400">Deceive. Deduce. Survive.</p>
      </div>

      <div className="space-y-3">
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
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, LOBBY_CODE_LENGTH))}
              placeholder="ABC123"
              className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-slate-500 tracking-widest font-mono text-lg"
            />
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {mode !== 'join' && (
          <button
            disabled={busy}
            onClick={onCreate}
            className="w-full rounded-lg bg-red-500 hover:bg-red-400 disabled:opacity-50 py-3 font-semibold"
          >
            Create Lobby
          </button>
        )}
        {mode === 'join' ? (
          <button
            disabled={busy}
            onClick={onJoin}
            className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 py-3 font-semibold text-slate-950"
          >
            Join
          </button>
        ) : (
          <button
            onClick={() => setMode('join')}
            className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 py-3 font-semibold"
          >
            Join Lobby
          </button>
        )}
        {mode === 'join' && (
          <button
            onClick={() => setMode('none')}
            className="text-sm text-slate-400 hover:text-slate-200 py-2"
          >
            Back
          </button>
        )}
      </div>

      <div className="text-xs text-slate-500 text-center pt-6">
        Host creates a lobby, shares the code. 5–12 players, roles are secret,
        night → discussion → voting, last team standing wins.
      </div>
    </div>
  );
}
