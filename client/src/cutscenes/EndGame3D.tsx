import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh } from 'three';
import * as THREE from 'three';
import { Scene } from '../three/Scene';
import { Ground, MoonLight, Trophy3D } from '../three/figures3d';

function ConfettiBurst({ color = '#f3c969', count = 80 }: { color?: string; count?: number }) {
  const group = useRef<Group>(null);
  const t0 = useRef<number | null>(null);
  const dirs = useRef<Array<[number, number, number, number]>>([]);
  if (dirs.current.length === 0) {
    let s = 7;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let i = 0; i < count; i++) {
      const theta = rand() * Math.PI * 2;
      const r = 0.5 + rand() * 3;
      const spin = rand() * 10;
      dirs.current.push([
        Math.cos(theta) * r,
        1 + rand() * 2.5,
        Math.sin(theta) * r,
        spin,
      ]);
    }
  }

  useFrame((state) => {
    if (!group.current) return;
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    const t = (state.clock.elapsedTime - t0.current) % 4; // loop every 4s
    const children = group.current.children as Mesh[];
    for (let i = 0; i < children.length; i++) {
      const [dx, dy, dz, spin] = dirs.current[i]!;
      const prog = Math.min(1, t / 2.5);
      children[i]!.position.set(
        dx * prog,
        dy * prog - 3.5 * Math.pow(prog, 2) + 2,
        dz * prog,
      );
      children[i]!.rotation.set(t * spin, t * spin * 0.5, t * spin * 0.3);
      const mat = children[i]!.material as THREE.MeshStandardMaterial;
      if (mat && 'opacity' in mat) {
        mat.transparent = true;
        mat.opacity = Math.max(0, 1 - prog);
      }
    }
  });

  return (
    <group ref={group}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.08, 0.15, 0.02]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

export function EndGameScene3D({ mafiaWin }: { mafiaWin: boolean }) {
  const color = mafiaWin ? '#c03838' : '#34d1a0';
  return (
    <Scene height={280} camera={{ position: [0, 1.8, 5], fov: 42 }}>
      <MoonLight />
      <Ground color="#06080f" />
      <Trophy3D position={[0, 0, 0]} color={mafiaWin ? '#c03838' : '#f3c969'} scale={1} />
      <ConfettiBurst color={color} />
      <pointLight position={[0, 3, 2]} color={color} intensity={1.6} distance={6} />
    </Scene>
  );
}
