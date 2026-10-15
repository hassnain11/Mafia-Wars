import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { setToastHandler } from '../lib/socketWire';

type ToastItem = {
  id: number;
  text: string;
  level: 'info' | 'warn' | 'error';
};

let nextId = 1;
let externalPush: ((t: Omit<ToastItem, 'id'>) => void) | null = null;

export function pushToast(text: string, level: ToastItem['level'] = 'info'): void {
  externalPush?.({ text, level });
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    externalPush = (t) => {
      const id = nextId++;
      setItems((prev) => [...prev, { id, ...t }]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 4000);
    };
    setToastHandler((t) => {
      const level = ('level' in t ? t.level : 'info') as ToastItem['level'];
      externalPush?.({ text: t.text, level });
    });
    return () => {
      externalPush = null;
      setToastHandler(() => {});
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 flex flex-col items-center gap-2 px-4 z-50">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`pointer-events-auto surface px-4 py-2.5 text-sm max-w-sm w-full text-center font-display ${
              t.level === 'error'
                ? '!border-blood-500/40 !shadow-bloodglow'
                : t.level === 'warn'
                  ? '!border-amber-500/40'
                  : '!border-moonlight/30'
            }`}
            role="status"
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
