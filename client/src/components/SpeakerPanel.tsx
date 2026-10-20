// Shown at the top of the Discussion screen when voiceEnabled.
// Displays the current speaker + per-turn countdown and offers a
// Request / Release mic button during the rebuttal stage.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { EV } from '@mafia/shared';
import { socket } from '../socket';
import { useGameStore } from '../store/gameStore';
import { Button } from './ui';
import { Mic, MicOff } from 'lucide-react';

export function SpeakerPanel() {
  const lobby = useGameStore((s) => s.lobby);
  const pid = useGameStore((s) => s.playerId);
  const discussion = lobby?.discussion;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!discussion?.speaker) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [discussion?.speaker?.endsAt, discussion?.speaker?.playerId]);

  if (!lobby || !discussion) return null;

  const speaker = discussion.speaker;
  const stage = discussion.stage;
  const speakerName =
    (speaker && lobby.players.find((p) => p.id === speaker.playerId)?.name) ?? null;
  const totalEligible = discussion.order.length;
  const accusationCount = discussion.accusationDone.length;
  const rebuttalCount = discussion.rebuttalDone.length;

  const secondsLeft = speaker ? Math.max(0, Math.ceil((speaker.endsAt - now) / 1000)) : 0;
  const isMySpeaker = speaker?.playerId === pid;
  const canRequestRebuttal =
    stage === 'rebuttal' &&
    !speaker &&
    pid !== null &&
    discussion.order.includes(pid) &&
    !discussion.rebuttalDone.includes(pid);

  function requestMic() {
    socket.emit(EV.REQUEST_REBUTTAL, {});
  }
  function releaseMic() {
    socket.emit(EV.RELEASE_REBUTTAL, {});
  }

  const stageLabel =
    stage === 'accusation'
      ? `Accusations · ${accusationCount}/${totalEligible}`
      : stage === 'rebuttal'
        ? `Rebuttals · ${rebuttalCount}/${totalEligible}`
        : 'Discussion closed';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface px-4 py-3 flex items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.25em] text-parchment-200/60">
          {stageLabel}
        </div>
        {speaker ? (
          <div className="font-serif text-lg tracking-wide truncate flex items-center gap-2">
            <Mic size={16} className="text-emerald-400 animate-pulse" />
            <span className={isMySpeaker ? 'text-gold-400' : 'text-parchment-100'}>
              {isMySpeaker ? 'You are speaking' : speakerName ?? 'Someone'}
            </span>
          </div>
        ) : stage === 'rebuttal' ? (
          <div className="font-serif text-lg tracking-wide text-parchment-200/80">
            <MicOff size={16} className="inline mr-2 text-parchment-300/50" />
            Mic available — anyone can rebut
          </div>
        ) : (
          <div className="font-serif text-lg tracking-wide text-parchment-200/60">
            Preparing…
          </div>
        )}
      </div>
      {speaker && (
        <div
          className={`font-serif text-2xl font-bold tabular-nums ${
            secondsLeft <= 3 ? 'text-blood-500' : 'text-gold-400'
          }`}
        >
          0:{String(secondsLeft).padStart(2, '0')}
        </div>
      )}
      {canRequestRebuttal && (
        <Button variant="gold" onClick={requestMic} icon={<Mic size={14} />}>
          Request mic
        </Button>
      )}
      {isMySpeaker && (
        <Button variant="ghost" onClick={releaseMic} icon={<MicOff size={14} />}>
          Release
        </Button>
      )}
    </motion.div>
  );
}
