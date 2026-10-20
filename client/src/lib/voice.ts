// Minimal WebRTC P2P audio voice chat.
// - Mesh topology (every alive pair gets a connection).
// - Google public STUN only — no TURN. Works for ~70-80% of networks.
// - Local mic starts muted; only enabled while this client is the active
//   speaker. All other peers receive the stream and play it via <audio>.
//
// Signaling goes through Socket.IO: {to, type, data} relayed by the server.

import { EV } from '@mafia/shared';
import { socket } from '../socket';

type SignalType = 'offer' | 'answer' | 'ice';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: false,
};

interface Status {
  initialized: boolean;
  micGranted: boolean;
  micError: string | null;
  peerIds: string[];
}

type StatusListener = (s: Status) => void;

class VoiceManager {
  private pcs = new Map<string, RTCPeerConnection>();
  private audioEls = new Map<string, HTMLAudioElement>();
  private localStream: MediaStream | null = null;
  private selfId: string | null = null;
  private peers: Set<string> = new Set();
  private signalBound = false;
  private status: Status = {
    initialized: false,
    micGranted: false,
    micError: null,
    peerIds: [],
  };
  private listeners = new Set<StatusListener>();

  getStatus(): Status {
    return this.status;
  }

  subscribe(fn: StatusListener): () => void {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  private pushStatus(patch: Partial<Status>): void {
    this.status = { ...this.status, ...patch };
    for (const fn of this.listeners) fn(this.status);
  }

  async init(selfId: string, peerIds: string[]): Promise<void> {
    if (this.status.initialized && this.selfId === selfId) {
      // Just reconcile peers (someone joined/left).
      this.reconcilePeers(peerIds);
      return;
    }
    this.selfId = selfId;
    this.peers = new Set(peerIds.filter((id) => id !== selfId));
    this.status = { ...this.status, initialized: true, peerIds: [...this.peers] };

    // Attach socket listener once per session.
    if (!this.signalBound) {
      this.signalBound = true;
      socket.on(EV.RTC_RELAY, (p: { from: string; type: SignalType; data: unknown }) => {
        void this.handleSignal(p.from, p.type, p.data);
      });
    }

    // Ask for microphone — if denied, we still listen.
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
      for (const t of this.localStream.getAudioTracks()) t.enabled = false;
      this.pushStatus({ micGranted: true, micError: null });
    } catch (e) {
      this.localStream = null;
      this.pushStatus({
        micGranted: false,
        micError:
          (e as DOMException)?.name === 'NotAllowedError'
            ? 'Microphone permission denied'
            : 'Microphone unavailable',
      });
    }

    for (const peerId of this.peers) {
      this.createPeerConnection(peerId);
    }
    // Initiator rule: the lexicographically-smaller id makes the offer.
    for (const peerId of this.peers) {
      if (selfId < peerId) void this.makeOffer(peerId);
    }
  }

  private reconcilePeers(wantPeers: string[]): void {
    const want = new Set(wantPeers.filter((id) => id !== this.selfId));
    // Drop peers no longer alive.
    for (const id of this.peers) {
      if (!want.has(id)) this.closePeer(id);
    }
    // Add new peers.
    for (const id of want) {
      if (!this.peers.has(id)) {
        this.peers.add(id);
        this.createPeerConnection(id);
        if (this.selfId && this.selfId < id) void this.makeOffer(id);
      }
    }
    this.pushStatus({ peerIds: [...this.peers] });
  }

  setMicEnabled(enabled: boolean): void {
    if (!this.localStream) return;
    for (const t of this.localStream.getAudioTracks()) t.enabled = enabled;
  }

  teardown(): void {
    for (const pc of this.pcs.values()) pc.close();
    this.pcs.clear();
    for (const [id, el] of this.audioEls) {
      el.srcObject = null;
      el.remove();
      this.audioEls.delete(id);
    }
    if (this.localStream) {
      for (const t of this.localStream.getAudioTracks()) t.stop();
      this.localStream = null;
    }
    this.peers.clear();
    this.selfId = null;
    this.pushStatus({ initialized: false, micGranted: false, micError: null, peerIds: [] });
  }

  // ----------------------------------------------------------------------

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const existing = this.pcs.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.pcs.set(peerId, pc);
    this.peers.add(peerId);

    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    pc.ontrack = (ev) => {
      const stream = ev.streams[0] ?? new MediaStream([ev.track]);
      let el = this.audioEls.get(peerId);
      if (!el) {
        el = document.createElement('audio');
        el.autoplay = true;
        el.setAttribute('data-voice-peer', peerId);
        document.body.appendChild(el);
        this.audioEls.set(peerId, el);
      }
      el.srcObject = stream;
      // iOS/some browsers need an explicit play() after a user gesture.
      el.play().catch(() => {});
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.sendSignal(peerId, 'ice', ev.candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        // Will be re-created on next reconcile.
      }
    };

    return pc;
  }

  private closePeer(peerId: string): void {
    const pc = this.pcs.get(peerId);
    pc?.close();
    this.pcs.delete(peerId);
    const el = this.audioEls.get(peerId);
    if (el) {
      el.srcObject = null;
      el.remove();
      this.audioEls.delete(peerId);
    }
    this.peers.delete(peerId);
  }

  private async makeOffer(peerId: string): Promise<void> {
    const pc = this.pcs.get(peerId);
    if (!pc) return;
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      this.sendSignal(peerId, 'offer', { sdp: offer.sdp, type: offer.type });
    } catch (err) {
      console.warn('[voice] makeOffer failed', err);
    }
  }

  private async handleSignal(from: string, type: SignalType, data: unknown): Promise<void> {
    if (!this.selfId) return;
    if (from === this.selfId) return;
    let pc = this.pcs.get(from);
    if (!pc) {
      pc = this.createPeerConnection(from);
      this.peers.add(from);
      this.pushStatus({ peerIds: [...this.peers] });
    }
    try {
      if (type === 'offer') {
        await pc.setRemoteDescription(data as RTCSessionDescriptionInit);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignal(from, 'answer', { sdp: answer.sdp, type: answer.type });
      } else if (type === 'answer') {
        if (pc.signalingState !== 'stable') {
          await pc.setRemoteDescription(data as RTCSessionDescriptionInit);
        }
      } else if (type === 'ice') {
        try {
          await pc.addIceCandidate(data as RTCIceCandidateInit);
        } catch {
          /* no-op */
        }
      }
    } catch (err) {
      console.warn('[voice] handleSignal failed', err);
    }
  }

  private sendSignal(to: string, type: SignalType, data: unknown): void {
    socket.emit(EV.RTC_SIGNAL, { to, type, data });
  }
}

export const voice = new VoiceManager();
