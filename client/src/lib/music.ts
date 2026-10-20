// Background music manager. Single playing track at a time, crossfaded
// when the phase requests a change. Missing files fail silently — the
// game still plays with no music.
import { PHASE } from '@mafia/shared';

export type MusicTrack = 'lobby' | 'night' | 'discussion' | 'voting' | null;

const TRACK_SRC: Record<Exclude<MusicTrack, null>, string> = {
  lobby: '/audio/lobby.mp3',
  night: '/audio/night.mp3',
  discussion: '/audio/discussion.mp3',
  voting: '/audio/voting.mp3',
};

export function trackForPhase(phase: string): MusicTrack {
  switch (phase) {
    case PHASE.LOBBY:
    case PHASE.ROLE_REVEAL:
      return 'lobby';
    case PHASE.NIGHT_MAFIA:
    case PHASE.NIGHT_DOCTOR:
    case PHASE.NIGHT_DETECTIVE:
    case PHASE.DAWN:
    case PHASE.ENDED:
      return 'night';
    case PHASE.DISCUSSION:
      return 'discussion';
    case PHASE.VOTING:
    case PHASE.VOTE_TIEBREAK:
    case PHASE.VOTE_RESULT:
      return 'voting';
    default:
      return null;
  }
}

type Listener = (snapshot: Snapshot) => void;
interface Snapshot {
  enabled: boolean;
  volume: number;
  currentTrack: MusicTrack;
}

const LS_ENABLED = 'mafia.music.enabled';
const LS_VOLUME = 'mafia.music.volume';

class MusicManager {
  private audio: HTMLAudioElement | null = null;
  private incomingAudio: HTMLAudioElement | null = null;
  private currentTrack: MusicTrack = null;
  private wantTrack: MusicTrack = null;
  private enabled = true;
  private volume = 0.15;
  private unlocked = false;
  private listeners = new Set<Listener>();
  private crossfadeTimer: number | null = null;

  constructor() {
    if (typeof window === 'undefined') return;
    try {
      const en = localStorage.getItem(LS_ENABLED);
      if (en === '0') this.enabled = false;
      const v = localStorage.getItem(LS_VOLUME);
      if (v !== null) this.volume = Math.max(0, Math.min(1, parseFloat(v)));
    } catch {
      /* no-op */
    }
    // Browser autoplay policy: wait for a user gesture before allowing audio.
    const unlock = () => {
      this.unlocked = true;
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      // Re-attempt whatever track was requested while locked.
      if (this.wantTrack) this.play(this.wantTrack);
    };
    document.addEventListener('pointerdown', unlock, { once: false });
    document.addEventListener('keydown', unlock, { once: false });
  }

  getSnapshot(): Snapshot {
    return { enabled: this.enabled, volume: this.volume, currentTrack: this.currentTrack };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.getSnapshot());
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    const snap = this.getSnapshot();
    for (const fn of this.listeners) fn(snap);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    try {
      localStorage.setItem(LS_ENABLED, on ? '1' : '0');
    } catch {
      /* no-op */
    }
    if (!on) {
      this.stop();
    } else if (this.wantTrack) {
      this.play(this.wantTrack);
    }
    this.emit();
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    try {
      localStorage.setItem(LS_VOLUME, String(this.volume));
    } catch {
      /* no-op */
    }
    if (this.audio) this.audio.volume = this.volume;
    this.emit();
  }

  stop(): void {
    this.cancelCrossfade();
    if (this.audio) {
      this.audio.pause();
      this.audio.srcObject = null;
      this.audio.src = '';
      this.audio = null;
    }
    if (this.incomingAudio) {
      this.incomingAudio.pause();
      this.incomingAudio.src = '';
      this.incomingAudio = null;
    }
    this.currentTrack = null;
    this.emit();
  }

  play(track: MusicTrack): void {
    this.wantTrack = track;
    if (!this.enabled) return;
    if (!this.unlocked) return;
    if (track === null) {
      this.stop();
      return;
    }
    if (track === this.currentTrack && this.audio && !this.audio.paused) return;

    const src = TRACK_SRC[track];
    const next = new Audio(src);
    next.loop = true;
    next.preload = 'auto';
    next.volume = 0;
    next.addEventListener('error', () => {
      // Missing file — silent failure.
      if (this.incomingAudio === next) this.incomingAudio = null;
    });
    const playPromise = next.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        if (this.incomingAudio === next) this.incomingAudio = null;
      });
    }

    this.cancelCrossfade();
    const previous = this.audio;
    this.incomingAudio = next;

    // Crossfade over ~1 second.
    const steps = 20;
    const stepMs = 50;
    let i = 0;
    const target = this.volume;
    const startFrom = previous?.volume ?? 0;
    this.crossfadeTimer = window.setInterval(() => {
      i++;
      const t = i / steps;
      next.volume = Math.min(target, target * t);
      if (previous) previous.volume = Math.max(0, startFrom * (1 - t));
      if (i >= steps) {
        this.cancelCrossfade();
        if (previous) {
          previous.pause();
          previous.src = '';
        }
        this.audio = next;
        this.incomingAudio = null;
        this.currentTrack = track;
        this.emit();
      }
    }, stepMs);
  }

  private cancelCrossfade(): void {
    if (this.crossfadeTimer !== null) {
      clearInterval(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
  }
}

export const music = new MusicManager();
