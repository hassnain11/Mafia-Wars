import { ROLE, type Role } from '@mafia/shared';

export const ROLE_META: Record<
  Role,
  { label: string; color: string; glow: string; description: string; emoji: string }
> = {
  [ROLE.MAFIA]: {
    label: 'Mafia',
    color: '#c03838',
    glow: 'shadow-bloodglow',
    description: 'Hunt in silence. Pick one target each night.',
    emoji: '🗡',
  },
  [ROLE.DOCTOR]: {
    label: 'Doctor',
    color: '#34d1a0',
    glow: 'shadow-glow',
    description: 'One soul saved each night, if you choose rightly.',
    emoji: '🩺',
  },
  [ROLE.DETECTIVE]: {
    label: 'Detective',
    color: '#7cc0ff',
    glow: 'shadow-glow',
    description: 'Investigate one soul each night. Your knowledge is private.',
    emoji: '🔍',
  },
  [ROLE.CIVILIAN]: {
    label: 'Civilian',
    color: '#f3c969',
    glow: 'shadow-goldglow',
    description: 'Survive. Deduce. Vote the mafia out before dawn breaks.',
    emoji: '🏮',
  },
};

export function RoleSeal({ role, size = 160 }: { role: Role; size?: number }) {
  const meta = ROLE_META[role];
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full ${meta.glow}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 25%, ${meta.color}30 0%, transparent 60%), radial-gradient(circle at 50% 50%, #0b1120 0%, #06080f 100%)`,
        border: `2px solid ${meta.color}80`,
      }}
    >
      <div
        className="absolute inset-2 rounded-full border"
        style={{ borderColor: `${meta.color}40` }}
      />
      <div
        className="absolute inset-4 rounded-full border"
        style={{ borderColor: `${meta.color}20` }}
      />
      <span style={{ fontSize: size * 0.4 }}>{meta.emoji}</span>
    </div>
  );
}
