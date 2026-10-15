import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CHAT_MAX, EV } from '@mafia/shared';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';
import { PhaseHeader } from '../components/PhaseHeader';
import { SpectatorBanner } from '../components/SpectatorBanner';
import { Button, Card } from '../components/ui';
import { Send } from 'lucide-react';

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
      <PhaseHeader
        title="Discussion"
        subtitle="Speak carefully. Someone is listening."
        endsAt={lobby.phaseEndsAt}
        icon="🏮"
      />
      {self.isSpectator && <SpectatorBanner round={lobby.round} />}
      {lobby.pinnedDawnMessage && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface px-3 py-2 text-sm text-parchment-200/90 font-display italic flex gap-2 items-center"
        >
          <span>📜</span>
          <span>{lobby.pinnedDawnMessage}</span>
        </motion.div>
      )}
      <Card className="!p-0 flex-1 min-h-[260px] max-h-[55vh] overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 text-sm">
          {chat.length === 0 && (
            <div className="text-parchment-200/40 italic text-center py-10 font-display">
              The room is still. No one has spoken yet.
            </div>
          )}
          <AnimatePresence initial={false}>
            {chat.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2 items-start"
              >
                <span
                  className={`font-serif font-semibold ${
                    m.from.id === pid ? 'text-blood-500' : 'text-gold-400'
                  }`}
                >
                  {m.from.name}:
                </span>
                <span className="text-parchment-100/90">{m.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>
      {canChat ? (
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            maxLength={CHAT_MAX}
            placeholder="Speak…"
            className="flex-1 bg-night-900/70 border border-parchment-300/15 rounded-lg px-3 py-2.5 outline-none focus:border-gold-500/60 focus:shadow-glow transition font-display"
          />
          <Button variant="primary" onClick={send} disabled={!text.trim()} icon={<Send size={14} />}>
            Send
          </Button>
        </div>
      ) : (
        <div className="surface px-3 py-2 text-xs text-parchment-200/60 text-center italic">
          You are a spectator. You can watch but not speak.
        </div>
      )}
    </div>
  );
}
