import { useEffect, useRef, useState } from 'react';
import { CHAT_MAX, EV } from '@mafia/shared';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';
import { PhaseHeader } from '../components/PhaseHeader';
import { SpectatorBanner } from '../components/SpectatorBanner';

export function Discussion() {
  const lobby = useGameStore((s) => s.lobby);
  const self = useGameStore((s) => s.self);
  const pid = useGameStore((s) => s.playerId);
  const chat = useGameStore((s) => s.chat);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat.length]);

  if (!lobby || !self || !pid) return null;

  const me = lobby.players.find((p) => p.id === pid);
  const canChat = me?.alive && !self.isSpectator;

  function send() {
    const t = text.trim();
    if (!t) return;
    socket.emit(EV.CHAT_SEND, { text: t });
    setText('');
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <PhaseHeader title="💬 Discussion" endsAt={lobby.phaseEndsAt} />
      {self.isSpectator && <SpectatorBanner round={lobby.round} />}
      {lobby.pinnedDawnMessage && (
        <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-300">
          📌 {lobby.pinnedDawnMessage}
        </div>
      )}
      <div
        ref={scrollRef}
        className="flex-1 min-h-[200px] max-h-[50vh] overflow-y-auto rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 space-y-1 text-sm"
      >
        {chat.length === 0 && (
          <div className="text-slate-500 text-center py-6">No messages yet.</div>
        )}
        {chat.map((m, i) => (
          <div key={i}>
            <span
              className={`font-semibold ${m.from.id === pid ? 'text-red-400' : 'text-slate-200'}`}
            >
              {m.from.name}:
            </span>{' '}
            <span className="text-slate-300">{m.text}</span>
          </div>
        ))}
      </div>
      {canChat ? (
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            maxLength={CHAT_MAX}
            placeholder="Type a message…"
            className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-slate-500"
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="rounded-lg bg-red-500 hover:bg-red-400 disabled:opacity-50 px-4 py-2 font-semibold"
          >
            Send
          </button>
        </div>
      ) : (
        <div className="rounded-lg bg-slate-800/60 border border-slate-700 px-3 py-2 text-xs text-slate-400 text-center">
          You are a spectator. You can watch but not chat.
        </div>
      )}
    </div>
  );
}
