// Shared character silhouettes for cutscenes.
// Keep them abstract — hooded figures work for all roles.

export function HoodedFigure({
  size = 160,
  color = '#111a2e',
  accent = '#c03838',
  flip = false,
}: {
  size?: number;
  color?: string;
  accent?: string;
  flip?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size * 1.3}
      viewBox="0 0 100 130"
      xmlns="http://www.w3.org/2000/svg"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      {/* cloak body */}
      <path
        d="M50 25 C 30 25 18 50 22 95 L 20 125 L 80 125 L 78 95 C 82 50 70 25 50 25 Z"
        fill={color}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1"
      />
      {/* inner shadow of hood */}
      <ellipse cx="50" cy="38" rx="22" ry="20" fill="#000" opacity="0.9" />
      {/* two glowing eyes */}
      <circle cx="43" cy="36" r="1.6" fill={accent} />
      <circle cx="57" cy="36" r="1.6" fill={accent} />
      {/* clasp */}
      <circle cx="50" cy="78" r="2.5" fill={accent} opacity="0.9" />
    </svg>
  );
}

export function DaggerIcon({ size = 60, color = '#e4e8f3' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dblade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor="#5c6a89" />
        </linearGradient>
      </defs>
      {/* blade */}
      <path d="M24 2 L28 28 L24 32 L20 28 Z" fill="url(#dblade)" />
      {/* crossguard */}
      <rect x="14" y="30" width="20" height="3" rx="1" fill="#d4a63a" />
      {/* grip */}
      <rect x="22" y="33" width="4" height="12" rx="1" fill="#4b2a1a" />
      <circle cx="24" cy="46" r="2.5" fill="#d4a63a" />
    </svg>
  );
}

export function ShieldIcon({
  size = 100,
  color = '#34d1a0',
  broken = false,
}: {
  size?: number;
  color?: string;
  broken?: boolean;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <path
        d="M50 10 L85 22 L82 55 C 80 72 65 85 50 92 C 35 85 20 72 18 55 L15 22 Z"
        fill="url(#shieldGrad)"
        stroke={color}
        strokeWidth="2"
      />
      {broken && (
        <path
          d="M30 25 L45 45 L35 55 L55 72 L48 50 L58 42 Z"
          fill="#06080f"
          opacity="0.95"
        />
      )}
      {!broken && <path d="M50 25 L50 75" stroke={color} strokeWidth="1.5" opacity="0.6" />}
    </svg>
  );
}

export function BloodSplat({ size = 240 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="splat" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c03838" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#73181a" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#73181a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="55" fill="url(#splat)" />
      {/* droplets */}
      {DROPLETS.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#c03838" opacity="0.9" />
      ))}
      {/* streaks */}
      <path
        d="M120 120 L30 60 M120 120 L210 65 M120 120 L205 190 M120 120 L50 200 M120 120 L130 20"
        stroke="#c03838"
        strokeWidth="2"
        opacity="0.6"
      />
    </svg>
  );
}

const DROPLETS: Array<[number, number, number]> = [
  [60, 50, 6], [40, 90, 4], [25, 140, 5], [55, 185, 7], [100, 210, 4], [155, 215, 5],
  [195, 180, 6], [215, 130, 4], [205, 80, 5], [160, 45, 6], [100, 30, 3], [85, 160, 3],
  [170, 160, 3],
];

export function MagnifierIcon({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="lens" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7cc0ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#7cc0ff" stopOpacity="0.1" />
        </radialGradient>
      </defs>
      <circle cx="40" cy="40" r="25" fill="url(#lens)" stroke="#d4a63a" strokeWidth="3" />
      <line x1="60" y1="60" x2="85" y2="85" stroke="#d4a63a" strokeWidth="6" strokeLinecap="round" />
      <circle cx="35" cy="35" r="4" fill="#f6ecd3" opacity="0.6" />
    </svg>
  );
}

export function Candle({ size = 60 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 2}
      viewBox="0 0 40 80"
      xmlns="http://www.w3.org/2000/svg"
      className="animate-flicker"
    >
      <defs>
        <radialGradient id="flame" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#fff6d3" />
          <stop offset="50%" stopColor="#f3c969" />
          <stop offset="100%" stopColor="#c03838" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* glow */}
      <circle cx="20" cy="18" r="18" fill="#f3c969" opacity="0.15" />
      {/* flame */}
      <path
        d="M20 6 Q24 14 22 22 Q26 28 22 32 Q18 28 18 22 Q16 14 20 6 Z"
        fill="url(#flame)"
      />
      {/* wick */}
      <line x1="20" y1="30" x2="20" y2="36" stroke="#111" strokeWidth="1.2" />
      {/* candle body */}
      <rect x="14" y="36" width="12" height="38" rx="2" fill="#e9d9ad" />
      <rect x="14" y="36" width="12" height="38" rx="2" fill="url(#flame)" opacity="0.08" />
      {/* holder */}
      <path d="M10 74 L30 74 L26 80 L14 80 Z" fill="#8b6418" />
    </svg>
  );
}
