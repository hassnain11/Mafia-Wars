// Persistent player strip shown at the bottom of every in-game phase.
// Each slot is a small round character avatar + name; eliminated players
// get a red X overlay. Visibility of each player's role follows the
// standard mafia-game rules (see roleView.displayRoleFor).

import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { CharacterSprite } from './CharacterSprite';
import { displayRoleFor } from '../lib/roleView';

export function PlayerRoster() {
  const lobby = useGameStore((s) => s.lobby);
  const self = useGameStore((s) => s.self);
  const pid = useGameStore((s) => s.playerId);
  if (!lobby) return null;

  return (
    <div className="w-full mt-5 pt-3 border-t border-parchment-300/10">
      <div className="flex flex-wrap items-start justify-center gap-x-3 gap-y-2">
        <AnimatePresence>
          {lobby.players.map((p) => {
            // Never pass revealed roles here — the roster must always show
            // Civilian (per user's rule), except for your own slot and mafia
            // teammates. The dedicated end-game screen does the full reveal.
            const shownRole = displayRoleFor(self, p.id);
            const isMe = p.id === pid;
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                className="flex flex-col items-center gap-1 min-w-[52px]"
              >
                <div
                  className={`relative rounded-full overflow-hidden flex items-center justify-center ${
                    isMe
                      ? 'ring-2 ring-gold-500/70 shadow-[0_0_8px_rgba(243,201,105,0.4)]'
                      : 'ring-1 ring-parchment-300/15'
                  }`}
                  style={{
                    width: 48,
                    height: 48,
                    background:
                      'radial-gradient(circle at 50% 35%, rgba(188,212,255,0.08), rgba(6,8,15,0.6))',
                  }}
                >
                  {/* Shrink the sprite down and shift it up a touch so the
                      character's head/torso sits inside the circle. */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{ top: -8 }}
                  >
                    <CharacterSprite role={shownRole} size="xs" alive={p.alive} />
                  </div>
                  {!p.alive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <svg viewBox="0 0 48 48" className="w-9 h-9" aria-hidden>
                        <line
                          x1="8"
                          y1="8"
                          x2="40"
                          y2="40"
                          stroke="#c03838"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                        <line
                          x1="40"
                          y1="8"
                          x2="8"
                          y2="40"
                          stroke="#c03838"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  )}
                  {!p.connected && p.alive && (
                    <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-slate-500 ring-2 ring-night-950" />
                  )}
                </div>
                <div
                  className={`text-[10px] leading-tight text-center max-w-[56px] truncate ${
                    isMe ? 'text-parchment-100 font-semibold' : 'text-parchment-200/70'
                  } ${!p.alive ? 'line-through decoration-blood-500/60' : ''}`}
                >
                  {p.name}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
