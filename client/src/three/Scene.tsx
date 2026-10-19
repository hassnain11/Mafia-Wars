// Shared Canvas wrapper for all 3D scenes.
// Low-DPR, soft shadows, moonlight tint — matches the Mafia Wars aesthetic.
import { Canvas } from '@react-three/fiber';
import type { ReactNode } from 'react';

export function Scene({
  children,
  height = 420,
  camera = { position: [0, 2, 6], fov: 42 },
  background = 'transparent',
}: {
  children: ReactNode;
  height?: number;
  camera?: { position: [number, number, number]; fov?: number };
  background?: string;
}) {
  return (
    <div
      style={{ height, width: '100%' }}
      className="relative rounded-xl overflow-hidden"
    >
      <Canvas
        shadows
        dpr={[1, 1.8]}
        camera={camera}
        gl={{ antialias: true, alpha: background === 'transparent' }}
        style={{ background }}
      >
        {children}
      </Canvas>
    </div>
  );
}
