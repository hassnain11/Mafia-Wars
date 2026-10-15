import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { Button, Card, Chip, SectionTitle } from '../components/ui';
import { Medallion } from '../components/ui';
import { Candle } from '../cutscenes/figures';
import { Copy, LogOut, Play } from 'lucide-react';

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

  if (!lobby || !me) return <div className="text-center text-parchment-200/60 py-10">Loading…</div>;

  function copyCode() {
    if (!code) return;
    navigator.clipboard
      .writeText(code)
      .then(() => pushToast('Code copied', 'info'))
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
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card gold className="text-center relative overflow-hidden">
          <div className="absolute left-3 bottom-0 opacity-80">
            <Candle size={32} />
          </div>
          <div className="absolute right-3 bottom-0 opacity-80">
            <Candle size={32} />
          </div>
          <div className="text-xs uppercase tracking-[0.3em] text-parchment-200/60 mb-2">
            Lobby code
          </div>
          <button
            onClick={copyCode}
            className="group inline-flex items-center gap-3 font-serif text-4xl tracking-[0.3em] text-gold-400 hover:text-gold-500 transition"
          >
            {code}
            <Copy size={16} className="opacity-50 group-hover:opacity-100" />
          </button>
          <p className="mt-2 text-xs text-parchment-200/50 italic">
            Share this code with your fellow players.
          </p>
        </Card>
      </motion.div>

      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle>
            Players <span className="opacity-50 ml-1">({lobby.players.length}/12)</span>
          </SectionTitle>
          {lobby.players.length < MIN_PLAYERS && (
            <Chip className="!text-blood-500 !border-blood-500/40 !bg-blood-500/10">
              need {MIN_PLAYERS - lobby.players.length} more
            </Chip>
          )}
        </div>
        <ul className="grid grid-cols-4 sm:grid-cols-5 gap-4 pt-3">
          <AnimatePresence>
            {lobby.players.map((p) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                className="flex flex-col items-center gap-2"
              >
                <Medallion
                  name={p.name}
                  size="md"
                  connected={p.connected}
                  isHost={p.isHost}
                  isBot={p.isBot}
                />
                <div
                  className={`text-xs text-center max-w-full truncate ${
                    p.id === playerId ? 'text-parchment-100 font-semibold' : 'text-parchment-200/80'
                  }`}
                >
                  {p.name}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </Card>

      <Card>
        <SectionTitle>Rules</SectionTitle>
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
              <span className="font-mono text-parchment-100">{lobby.settings.mafiaCount}</span>
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
      </Card>

      {isHost && (
        <Button
          variant="primary"
          disabled={!canStart}
          onClick={startGame}
          icon={<Play size={16} />}
          fullWidth
        >
          Begin the Night
        </Button>
      )}
      <Button variant="ghost" onClick={leave} icon={<LogOut size={14} />} fullWidth>
        Leave Lobby
      </Button>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-parchment-200/80 font-display text-base">{label}</span>
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
        className="w-8 h-8 rounded-md bg-night-800 hover:bg-night-700 border border-parchment-300/15 disabled:opacity-30 transition"
      >
        −
      </button>
      <span className="font-mono w-14 text-center text-parchment-100">
        {value}
        {suffix}
      </span>
      <button
        onClick={inc}
        disabled={value >= max}
        className="w-8 h-8 rounded-md bg-night-800 hover:bg-night-700 border border-parchment-300/15 disabled:opacity-30 transition"
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
        value ? 'bg-gold-500 shadow-goldglow' : 'bg-night-700'
      }`}
      aria-pressed={value}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-parchment-100 transition ${
          value ? 'left-5' : 'left-0.5'
        }`}
      />
    </button>
  );
}
