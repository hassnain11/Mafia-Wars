// Full-page atmospheric background: moon, drifting stars, distant fog.
// Rendered once at app root, pointer-events: none so it never blocks UI.

export function Backdrop() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Soft moon */}
      <svg
        className="absolute right-[-6rem] top-[-6rem] opacity-80 animate-slowfloat"
        width="420"
        height="420"
        viewBox="0 0 420 420"
        fill="none"
        aria-hidden
      >
        <defs>
          <radialGradient id="moonHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#bcd4ff" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#bcd4ff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#bcd4ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="moonBody" cx="40%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#f6ecd3" />
            <stop offset="100%" stopColor="#b7bfd3" />
          </radialGradient>
        </defs>
        <circle cx="210" cy="210" r="200" fill="url(#moonHalo)" />
        <circle cx="210" cy="210" r="110" fill="url(#moonBody)" />
        {/* craters */}
        <circle cx="190" cy="180" r="12" fill="#9ba6bd" opacity="0.35" />
        <circle cx="245" cy="220" r="8" fill="#9ba6bd" opacity="0.3" />
        <circle cx="200" cy="235" r="6" fill="#9ba6bd" opacity="0.25" />
      </svg>

      {/* Starfield */}
      <svg
        className="absolute inset-0 w-full h-full opacity-50"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <radialGradient id="star" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {STAR_POSITIONS.map(([cx, cy, r, delay], i) => (
          <circle
            key={i}
            cx={`${cx}%`}
            cy={`${cy}%`}
            r={r}
            fill="url(#star)"
            style={{
              animation: `shimmer ${3 + ((i * 7) % 4)}s ease-in-out ${delay}s infinite`,
            }}
          />
        ))}
      </svg>

      {/* Castle silhouette at the bottom */}
      <svg
        className="absolute bottom-0 left-0 w-full opacity-40"
        viewBox="0 0 1600 220"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="castleGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#06080f" stopOpacity="0" />
            <stop offset="100%" stopColor="#06080f" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path
          d="M0 220 L0 180 L80 180 L80 140 L120 140 L120 100 L160 100 L160 140 L200 140 L200 170 L260 170 L260 120 L300 90 L340 120 L340 170 L420 170 L420 150 L460 150 L460 110 L500 110 L500 150 L560 150 L560 180 L640 180 L640 140 L680 100 L720 140 L720 180 L820 180 L820 150 L870 150 L870 100 L910 70 L950 100 L950 150 L1020 150 L1020 180 L1100 180 L1100 150 L1150 150 L1150 110 L1200 110 L1200 160 L1280 160 L1280 180 L1360 180 L1360 130 L1400 130 L1400 170 L1460 170 L1460 190 L1600 190 L1600 220 Z"
          fill="url(#castleGrad)"
        />
      </svg>

      {/* Vignette */}
      <div className="absolute inset-0 bg-moonlight-vignette" />
    </div>
  );
}

// (x%, y%, r, delay-s) — fixed so hydration is stable.
const STAR_POSITIONS: Array<[number, number, number, number]> = [
  [5, 10, 1, 0], [12, 25, 1.4, 0.6], [20, 8, 0.8, 1.2], [28, 18, 1.2, 0.3],
  [34, 5, 1, 1.5], [42, 22, 0.9, 0.8], [50, 12, 1.3, 0], [58, 6, 1, 0.4],
  [66, 20, 1.1, 1.1], [74, 10, 0.8, 0.7], [82, 24, 1.3, 0.2], [88, 14, 1, 1.6],
  [94, 7, 1.1, 0.5], [8, 40, 0.9, 1.3], [16, 55, 1.1, 0.6], [24, 65, 1.3, 0.1],
  [30, 48, 0.8, 1.2], [38, 72, 1, 0.9], [46, 58, 1.2, 0.3], [55, 68, 0.9, 1.4],
  [60, 52, 1.1, 0.5], [68, 60, 1.3, 1], [75, 48, 1, 0.7], [85, 55, 0.9, 1.3],
  [92, 68, 1.1, 0.4],
];
