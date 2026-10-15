// Core UI primitives: Button, Card, Chip, Medallion.
import { forwardRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type ButtonVariant = 'primary' | 'ghost' | 'gold';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  children: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'ghost', icon, children, fullWidth, className = '', ...rest },
  ref,
) {
  const cls =
    variant === 'primary' ? 'btn-primary' : variant === 'gold' ? 'btn-gold' : 'btn-ghost';
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      className={`rounded-xl px-4 py-3 font-serif font-semibold tracking-wide text-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ${cls} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...rest}
    >
      {icon}
      <span>{children}</span>
    </motion.button>
  );
});

export function Card({
  children,
  className = '',
  gold = false,
}: {
  children: ReactNode;
  className?: string;
  gold?: boolean;
}) {
  return (
    <div className={`surface ${gold ? 'surface-gold' : ''} p-4 ${className}`}>{children}</div>
  );
}

export function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`chip ${className}`}>{children}</span>;
}

export function Divider() {
  return (
    <div className="h-px bg-gradient-to-r from-transparent via-parchment-300/20 to-transparent" />
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h2 className="font-serif text-sm uppercase tracking-[0.2em] text-parchment-200">
        {children}
      </h2>
      <div className="flex-1 h-px bg-parchment-300/15" />
    </div>
  );
}

// Player avatar: initials circle with role-colored border + status dot.
export function Medallion({
  name,
  size = 'md',
  alive = true,
  connected = true,
  isBot = false,
  isHost = false,
  roleColor,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  alive?: boolean;
  connected?: boolean;
  isBot?: boolean;
  isHost?: boolean;
  roleColor?: string;
}) {
  const dim = size === 'lg' ? 72 : size === 'md' ? 52 : 36;
  const initials = getInitials(name);
  const hue = colorHashHue(name);
  const bg = `linear-gradient(135deg, hsl(${hue},45%,34%), hsl(${(hue + 40) % 360},45%,20%))`;
  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: dim }}>
      <div
        className={`relative rounded-full overflow-hidden ${
          alive ? '' : 'grayscale opacity-50'
        }`}
        style={{
          width: dim,
          height: dim,
          background: bg,
          border: `2px solid ${roleColor ?? 'rgba(243,201,105,0.35)'}`,
          boxShadow: alive
            ? '0 6px 14px -4px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15)'
            : 'none',
        }}
      >
        <span
          className="absolute inset-0 flex items-center justify-center font-serif font-bold text-parchment-100"
          style={{ fontSize: dim * 0.4 }}
        >
          {initials}
        </span>
        {!alive && (
          <span className="absolute inset-0 flex items-center justify-center text-2xl">💀</span>
        )}
      </div>
      {/* status dot */}
      <span
        className={`absolute right-0 bottom-1 h-2.5 w-2.5 rounded-full ring-2 ring-night-950 ${
          connected ? 'bg-emerald-400' : 'bg-slate-500'
        }`}
        aria-hidden
      />
      {isHost && (
        <span
          className="absolute -top-2 left-1/2 -translate-x-1/2 text-base"
          aria-label="host"
          title="host"
        >
          👑
        </span>
      )}
      {isBot && (
        <span className="absolute -right-1 -top-1 h-5 w-5 flex items-center justify-center rounded-full bg-night-800 border border-parchment-300/20 text-[10px]">
          🤖
        </span>
      )}
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function colorHashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
