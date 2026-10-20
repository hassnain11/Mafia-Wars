// Watches the lobby phase and tells the MusicManager which track to play.
// Mounted once at the app shell level — no visible UI.
import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { music, trackForPhase } from '../lib/music';

export function MusicController() {
  const phase = useGameStore((s) => s.lobby?.phase ?? null);

  useEffect(() => {
    if (!phase) {
      // Pre-lobby (home page) — play the lobby track as a general theme.
      music.play('lobby');
      return;
    }
    const track = trackForPhase(phase);
    music.play(track);
  }, [phase]);

  return null;
}
