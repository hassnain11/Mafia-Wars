// Mounted once at Discussion time (when voiceEnabled). Owns the voice
// manager lifecycle: initializes the mesh of peer connections for alive
// human players, flips the mic on/off when the server says it's our turn,
// and tears down when the game ends.
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { voice } from '../lib/voice';
import { MicOff, AlertTriangle } from 'lucide-react';

export function VoiceController() {
  const lobby = useGameStore((s) => s.lobby);
  const pid = useGameStore((s) => s.playerId);
  const ended = useGameStore((s) => s.lastGameEnded);
  const [status, setStatus] = useState(voice.getStatus());

  useEffect(() => voice.subscribe(setStatus), []);

  // Initialize / reconcile peer list whenever alive humans change.
  useEffect(() => {
    if (!lobby || !pid) return;
    if (!lobby.settings.voiceEnabled) return;
    const peerIds = lobby.players
      .filter((p) => p.alive && !p.isBot && p.id !== pid)
      .map((p) => p.id);
    void voice.init(pid, peerIds);
  }, [lobby, pid]);

  // Teardown when the game ends.
  useEffect(() => {
    if (ended) voice.teardown();
  }, [ended]);

  // Also teardown on unmount of the whole app (safety net).
  useEffect(() => {
    return () => {
      if (!useGameStore.getState().lobby) voice.teardown();
    };
  }, []);

  // Toggle local mic based on who the current speaker is.
  useEffect(() => {
    if (!lobby || !pid) return;
    const speakerId = lobby.discussion?.speaker?.playerId ?? null;
    voice.setMicEnabled(speakerId === pid);
  }, [lobby?.discussion?.speaker?.playerId, pid, lobby]);

  if (!lobby?.settings.voiceEnabled) return null;
  if (!status.initialized) return null;
  if (status.micGranted) return null;

  return (
    <div className="surface px-3 py-2 flex items-center gap-2 text-xs text-amber-300 border !border-amber-500/40">
      {status.micError?.includes('denied') ? (
        <>
          <MicOff size={14} />
          <span>
            Microphone blocked — unblock it in the browser site settings to speak. You can still
            hear others.
          </span>
        </>
      ) : (
        <>
          <AlertTriangle size={14} />
          <span>
            {status.micError ?? 'Microphone unavailable — you can hear others but not speak.'}
          </span>
        </>
      )}
    </div>
  );
}
