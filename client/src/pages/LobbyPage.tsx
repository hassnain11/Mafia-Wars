import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DISCUSSION_SECONDS_MAX,
  DISCUSSION_SECONDS_MIN,
  EV,
  MIN_PLAYERS,
  NIGHT_SECONDS_MAX,
  NIGHT_SECONDS_MIN,
  SETTINGS_SECONDS_STEP,
  VOTING_SECONDS_MAX,
  VOTING_SECONDS_MIN,
  mafiaCountMax,
} from '@mafia/shared';
import { socket } from '../socket';
import { clearPersistedSession, useGameStore } from '../store/gameStore';
import { pushToast } from '../components/Toast';
import { Crown, Copy, Bot } from 'lucide-react';

export function LobbyPage() {
  const { code } = useParams();
  const lobby = useGameStore((s) => s.lobby);
  const playerId = useGameStore((s) => s.playerId);
  const resetGame = useGameStore((s) => s.resetGame);
  const nav = useNavigate();

  const me = useMemo(
    () => lobby?.players.find((p) => p.id === playerId) ?? null,
    [lobby, playerId],
  );
  const isHost = !!me?.isHost;
  const maxMafia = Math.max(1, mafiaCountMax(lobby?.players.length ?? 3));
  const canStart = isHost && (lobby?.players.length ?? 0) >= MIN_PLAYERS;

  if (!lobby || !me) return <div className="text-center text-slate-400">Loading…</div>;

  function copyCode() {
    if (!code) return;
    navigator.clipboard
      .writeText(code)
      .then(() => pushToast('Copied', 'info'))
      .catch(() => pushToast('Copy failed', 'warn'));
  }

  function leave() {
    socket.emit(EV.LEAVE_LOBBY, {});
    clearPersistedSession();
    resetGame();
    nav('/', { replace: true });
  }

  function updateSetting(key: string, value: unknown) {
    socket.emit(EV.UPDATE_SETTINGS, { [key]: value });
  }

  function startGame() {
    socket.emit(EV.START_GAME, {});
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl bg-slate-900 border border-slate-800 p-4">
        <div className="text-xs uppercase tracking-widest text-slate-400">Lobby code</div>
        <button
          onClick={copyCode}
          className="mt-1 flex items-center gap-3 text-3xl font-mono tracking-widest"
        >
          {code}
          <Copy size={18} className="text-slate-400" />
        </button>
        <p className="mt-2 text-xs text-slate-500">Tap to copy. Share with your friends.</p>
      </section>

      <section className="rounded-xl bg-slate-900 border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">
            Players{' '}
            <span className="text-slate-400 font-normal">
              ({lobby.players.length}/12)
            </span>
          </h2>
          {lobby.players.length < MIN_PLAYERS && (
            <span className="text-xs text-amber-400">
              need {MIN_PLAYERS - lobby.players.length} more
            </span>
          )}
        </div>
        <ul className="divide-y divide-slate-800">
          {lobby.players.map((p) => (
            <li key={p.id} className="py-2 flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  p.connected ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
                aria-hidden
              />
              <span className={p.id === playerId ? 'font-semibold' : ''}>{p.name}</span>
              {p.isHost && <Crown size={14} className="text-amber-300" />}
              {p.isBot && <Bot size={14} className="text-slate-500" aria-label="bot" />}
              {p.id === playerId && <span className="text-xs text-slate-400">(you)</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-slate-900 border border-slate-800 p-4">
        <h2 className="font-semibold mb-3">Rules</h2>
        <div className="space-y-3 text-sm">
          <Row label="Mafia count">
            {isHost ? (
              <NumberStepper
                value={lobby.settings.mafiaCount}
                min={1}
                max={maxMafia}
                step={1}
                onChange={(v) => updateSetting('mafiaCount', v)}
              />
            ) : (
              <span className="font-mono">{lobby.settings.mafiaCount}</span>
            )}
          </Row>
          <Row label="Doctor">
            {isHost ? (
              <Toggle
                value={lobby.settings.doctorEnabled}
                onChange={(v) => updateSetting('doctorEnabled', v)}
              />
            ) : (
              <span>{lobby.settings.doctorEnabled ? 'On' : 'Off'}</span>
            )}
          </Row>
          <Row label="Detective">
            {isHost ? (
              <Toggle
                value={lobby.settings.detectiveEnabled}
                onChange={(v) => updateSetting('detectiveEnabled', v)}
              />
            ) : (
              <span>{lobby.settings.detectiveEnabled ? 'On' : 'Off'}</span>
            )}
          </Row>
          <Row label="Discussion">
            {isHost ? (
              <NumberStepper
                value={lobby.settings.discussionSeconds}
                min={DISCUSSION_SECONDS_MIN}
                max={DISCUSSION_SECONDS_MAX}
                step={SETTINGS_SECONDS_STEP}
                suffix="s"
                onChange={(v) => updateSetting('discussionSeconds', v)}
              />
            ) : (
              <span>{lobby.settings.discussionSeconds}s</span>
            )}
          </Row>
          <Row label="Voting">
            {isHost ? (
              <NumberStepper
                value={lobby.settings.votingSeconds}
                min={VOTING_SECONDS_MIN}
                max={VOTING_SECONDS_MAX}
                step={SETTINGS_SECONDS_STEP}
                suffix="s"
                onChange={(v) => updateSetting('votingSeconds', v)}
              />
            ) : (
              <span>{lobby.settings.votingSeconds}s</span>
            )}
          </Row>
          <Row label="Night">
            {isHost ? (
              <NumberStepper
                value={lobby.settings.nightSeconds}
                min={NIGHT_SECONDS_MIN}
                max={NIGHT_SECONDS_MAX}
                step={SETTINGS_SECONDS_STEP}
                suffix="s"
                onChange={(v) => updateSetting('nightSeconds', v)}
              />
            ) : (
              <span>{lobby.settings.nightSeconds}s</span>
            )}
          </Row>
        </div>
      </section>

      {isHost && (
        <button
          disabled={!canStart}
          onClick={startGame}
          className="w-full rounded-lg bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed py-3 font-semibold"
          title={canStart ? '' : `Need at least ${MIN_PLAYERS} players`}
        >
          Start Game
        </button>
      )}

      <button
        onClick={leave}
        className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 py-3 text-sm"
      >
        Leave Lobby
      </button>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-300">{label}</span>
      {children}
    </div>
  );
}

function NumberStepper({
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={dec}
        disabled={value <= min}
        className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
      >
        −
      </button>
      <span className="font-mono w-14 text-center">
        {value}
        {suffix}
      </span>
      <button
        onClick={inc}
        disabled={value >= max}
        className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-12 h-7 rounded-full relative transition ${
        value ? 'bg-emerald-500' : 'bg-slate-700'
      }`}
      aria-pressed={value}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${
          value ? 'left-5' : 'left-0.5'
        }`}
      />
    </button>
  );
}
