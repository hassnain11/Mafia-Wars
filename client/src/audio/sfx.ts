// Procedurally generated SFX via Web Audio API — no external assets.
// Designed to sound atmospheric and Traitors-ish: tolls, strikes, chimes, drones.

type Sound = 'strike' | 'bell' | 'chime' | 'horn' | 'reveal' | 'thud' | 'heartbeat';

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      const AC = (window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)!;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.35;
      masterGain.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx && ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setSfxEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem('mafia.sfx', on ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (masterGain) masterGain.gain.value = on ? 0.35 : 0;
}

export function isSfxEnabled(): boolean {
  try {
    const v = localStorage.getItem('mafia.sfx');
    if (v === '0') enabled = false;
    else if (v === '1') enabled = true;
  } catch {
    /* ignore */
  }
  return enabled;
}

export function unlockAudio(): void {
  // Call from a user-gesture handler the first time the user clicks.
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

export function play(name: Sound): void {
  if (!enabled) return;
  const c = getCtx();
  if (!c || !masterGain) return;
  switch (name) {
    case 'strike':
      strike(c, masterGain);
      break;
    case 'bell':
      bell(c, masterGain, 440);
      break;
    case 'chime':
      bell(c, masterGain, 880);
      break;
    case 'horn':
      horn(c, masterGain);
      break;
    case 'reveal':
      reveal(c, masterGain);
      break;
    case 'thud':
      thud(c, masterGain);
      break;
    case 'heartbeat':
      heartbeat(c, masterGain);
      break;
  }
}

function strike(c: AudioContext, out: AudioNode) {
  const dur = 0.35;
  const now = c.currentTime;
  // Metallic strike: noise burst + descending sine
  const noise = c.createBufferSource();
  const buffer = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / c.sampleRate;
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 18);
  }
  noise.buffer = buffer;
  const nGain = c.createGain();
  nGain.gain.value = 0.6;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2200;
  bp.Q.value = 4;
  noise.connect(bp).connect(nGain).connect(out);
  noise.start(now);
  noise.stop(now + dur);
  // tonal thunk
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);
  const oGain = c.createGain();
  oGain.gain.setValueAtTime(0.5, now);
  oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(oGain).connect(out);
  osc.start(now);
  osc.stop(now + 0.3);
}

function bell(c: AudioContext, out: AudioNode, freq: number) {
  const now = c.currentTime;
  const partials = [1, 2.76, 5.4, 8.93];
  partials.forEach((p, i) => {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * p;
    const g = c.createGain();
    const peak = 0.35 / (i + 1);
    g.gain.setValueAtTime(peak, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    osc.connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 2.6);
  });
}

function horn(c: AudioContext, out: AudioNode) {
  const now = c.currentTime;
  const freq = 110;
  const partials = [1, 2, 3];
  const dur = 1.1;
  partials.forEach((p, i) => {
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq * p;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.22 / (i + 1), now + 0.1);
    g.gain.setValueAtTime(0.22 / (i + 1), now + dur - 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1200;
    osc.connect(lp).connect(g).connect(out);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  });
}

function reveal(c: AudioContext, out: AudioNode) {
  const now = c.currentTime;
  const notes = [523.25, 659.25, 783.99]; // C E G
  notes.forEach((f, i) => {
    const osc = c.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0, now + i * 0.08);
    g.gain.linearRampToValueAtTime(0.25, now + i * 0.08 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.8);
    osc.connect(g).connect(out);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.9);
  });
}

function thud(c: AudioContext, out: AudioNode) {
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
  const g = c.createGain();
  g.gain.setValueAtTime(0.6, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(g).connect(out);
  osc.start(now);
  osc.stop(now + 0.4);
}

function heartbeat(c: AudioContext, out: AudioNode) {
  const now = c.currentTime;
  for (let b = 0; b < 2; b++) {
    const t0 = now + b * 0.35;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t0);
    osc.frequency.exponentialRampToValueAtTime(50, t0 + 0.15);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
    osc.connect(g).connect(out);
    osc.start(t0);
    osc.stop(t0 + 0.2);
  }
}
