// Shows a role-specific cartoon character sprite with a cleaned-up
// (transparent) background. Source JPGs live in /public/characters/.
import { useEffect, useState } from 'react';
import { ROLE, type Role } from '@mafia/shared';
import { processImage } from '../lib/imageProcessor';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<Size, number> = {
  xs: 48,
  sm: 72,
  md: 110,
  lg: 180,
  xl: 280,
};

const CHARACTER_SRC: Record<Role, string> = {
  [ROLE.MAFIA]: '/characters/mafia.jpg',
  [ROLE.DOCTOR]: '/characters/doctor.jpg',
  [ROLE.DETECTIVE]: '/characters/detective.jpg',
  [ROLE.CIVILIAN]: '/characters/civilian.jpg',
};

const ROLE_GLOW: Record<Role, string> = {
  [ROLE.MAFIA]: 'rgba(192,56,56,0.55)',
  [ROLE.DOCTOR]: 'rgba(52,209,160,0.55)',
  [ROLE.DETECTIVE]: 'rgba(124,192,255,0.55)',
  [ROLE.CIVILIAN]: 'rgba(243,201,105,0.35)',
};

// Kick off processing as soon as the module loads so sprites are warm.
if (typeof window !== 'undefined') {
  for (const url of Object.values(CHARACTER_SRC)) void processImage(url);
}

export function CharacterSprite({
  role,
  size = 'md',
  alive = true,
  highlighted = false,
  dim = false,
  className = '',
  onClick,
}: {
  role: Role;
  size?: Size;
  alive?: boolean;
  highlighted?: boolean;
  dim?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const px = SIZE_PX[size];
  const src = CHARACTER_SRC[role];
  const glow = ROLE_GLOW[role];
  const [resolved, setResolved] = useState<string>(src);

  useEffect(() => {
    let active = true;
    void processImage(src).then((url) => {
      if (active) setResolved(url);
    });
    return () => {
      active = false;
    };
  }, [src]);

  return (
    <div
      onClick={onClick}
      className={`relative inline-block ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        width: px,
        height: Math.round(px * 1.4),
        filter: !alive
          ? 'grayscale(1) brightness(0.4)'
          : dim
            ? 'brightness(0.6) saturate(0.6)'
            : 'none',
        transition: 'filter 0.3s ease, transform 0.15s ease',
      }}
    >
      <img
        src={resolved}
        alt={role}
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.7))',
        }}
      />
      {highlighted && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{
            boxShadow: `inset 0 0 24px ${glow}, 0 0 24px ${glow}`,
          }}
        />
      )}
      {!alive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-4xl">💀</span>
        </div>
      )}
    </div>
  );
}
