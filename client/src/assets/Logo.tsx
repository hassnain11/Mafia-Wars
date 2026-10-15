// Dagger-with-blood logo used as app mark.
import { motion } from 'framer-motion';

export function LogoMark({ size = 42, animate = true }: { size?: number; animate?: boolean }) {
  const Comp = animate ? motion.svg : 'svg';
  const motionProps = animate
    ? {
        initial: { rotate: -8, opacity: 0 },
        animate: { rotate: 0, opacity: 1 },
        transition: { duration: 0.8, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
      }
    : {};
  return (
    <Comp
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mafia Wars"
      {...(motionProps as object)}
    >
      <defs>
        <linearGradient id="blade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e4e8f3" />
          <stop offset="50%" stopColor="#9aa6c2" />
          <stop offset="100%" stopColor="#5c6a89" />
        </linearGradient>
        <linearGradient id="guard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3c969" />
          <stop offset="100%" stopColor="#a97e24" />
        </linearGradient>
        <linearGradient id="grip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4b2a1a" />
          <stop offset="100%" stopColor="#2a150a" />
        </linearGradient>
        <radialGradient id="blood" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c03838" />
          <stop offset="100%" stopColor="#73181a" />
        </radialGradient>
        <filter id="bladeGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* grip */}
      <rect x="29" y="40" width="6" height="16" rx="1.5" fill="url(#grip)" />
      {/* pommel */}
      <circle cx="32" cy="58" r="3.2" fill="url(#guard)" stroke="#8b6418" strokeWidth="0.6" />
      {/* crossguard */}
      <rect x="20" y="37" width="24" height="4.2" rx="1" fill="url(#guard)" stroke="#8b6418" strokeWidth="0.5" />
      <circle cx="20" cy="39.1" r="2.2" fill="url(#guard)" stroke="#8b6418" strokeWidth="0.5" />
      <circle cx="44" cy="39.1" r="2.2" fill="url(#guard)" stroke="#8b6418" strokeWidth="0.5" />
      {/* blade */}
      <path
        d="M32 4 L36 35 L32 38 L28 35 Z"
        fill="url(#blade)"
        stroke="#2b3350"
        strokeWidth="0.6"
        filter="url(#bladeGlow)"
      />
      {/* blade highlight */}
      <path d="M32 7 L33 33" stroke="#f6ecd3" strokeWidth="0.6" opacity="0.5" />
      {/* blood on tip */}
      <path
        d="M32 4 L34 12 L32 20 L30 12 Z"
        fill="url(#blood)"
        opacity="0.95"
      />
      {/* dripping blood */}
      <path d="M32 22 Q32 28 32 32" stroke="#c03838" strokeWidth="1" strokeLinecap="round" />
      <circle cx="32" cy="34" r="1.6" fill="#c03838" />
    </Comp>
  );
}

export function LogoWordmark({ size = 42 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={size} />
      <div className="flex flex-col leading-none">
        <span className="font-serif font-bold text-blood-500 tracking-[0.3em] text-sm">MAFIA</span>
        <span className="font-serif font-bold text-parchment-100 tracking-[0.4em] text-xs">
          WARS
        </span>
      </div>
    </div>
  );
}
