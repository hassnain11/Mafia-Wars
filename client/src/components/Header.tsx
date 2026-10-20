import { useEffect, useState } from 'react';
import { Music, Music2, Volume2, VolumeX } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { isSfxEnabled, setSfxEnabled, unlockAudio } from '../audio/sfx';
import { music } from '../lib/music';
import { LogoWordmark } from '../assets/Logo';

export function Header() {
  const connection = useGameStore((s) => s.connection);
  const [sfx, setSfx] = useState(() => isSfxEnabled());
  const [musicState, setMusicState] = useState(() => music.getSnapshot());
  const [showVolume, setShowVolume] = useState(false);

  useEffect(() => music.subscribe(setMusicState), []);

  const dotClass =
    connection === 'connected'
      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,160,0.6)]'
      : connection === 'connecting'
        ? 'bg-amber-400'
        : 'bg-blood-500';

  useEffect(() => {
    const unlock = () => unlockAudio();
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, []);

  function toggleSfx() {
    const next = !sfx;
    setSfx(next);
    setSfxEnabled(next);
  }

  function toggleMusic() {
    music.setEnabled(!musicState.enabled);
  }

  return (
    <header className="w-full border-b border-parchment-300/10 bg-night-950/70 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-screen-sm mx-auto px-5 py-3 flex items-center justify-between">
        <LogoWordmark size={32} />
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={toggleMusic}
              onDoubleClick={() => setShowVolume((v) => !v)}
              className="text-parchment-200/70 hover:text-parchment-100 p-1 rounded transition"
              aria-label={musicState.enabled ? 'Mute music (double-click for volume)' : 'Enable music'}
              title={musicState.enabled ? 'Music on — double-click for volume' : 'Music off'}
            >
              {musicState.enabled ? <Music size={16} /> : <Music2 size={16} className="opacity-40" />}
            </button>
            {showVolume && musicState.enabled && (
              <div className="absolute right-0 top-full mt-2 surface px-3 py-2 z-30">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={musicState.volume}
                  onChange={(e) => music.setVolume(parseFloat(e.target.value))}
                  className="w-28"
                  aria-label="Music volume"
                />
              </div>
            )}
          </div>
          <button
            onClick={toggleSfx}
            className="text-parchment-200/70 hover:text-parchment-100 p-1 rounded transition"
            aria-label={sfx ? 'Mute SFX' : 'Enable SFX'}
            title={sfx ? 'SFX on' : 'SFX off'}
          >
            {sfx ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <div className="flex items-center gap-2 text-xs text-parchment-200/70 ml-1">
            <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
            <span className="capitalize tracking-widest">{connection}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
