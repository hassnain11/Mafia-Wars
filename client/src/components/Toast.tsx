import { useEffect, useState } from 'react';
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
    <div className="pointer-events-none fixed inset-x-0 bottom-4 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-lg px-4 py-2 shadow-lg text-sm max-w-sm w-full text-center ${
            t.level === 'error'
              ? 'bg-red-600 text-white'
              : t.level === 'warn'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-sky-500 text-white'
          }`}
          role="status"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
