// 3D stylized primitives for Mafia Wars cutscenes.
// Low-poly, hooded figures + weapons + props. All procedural geometry.

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh } from 'three';
import * as THREE from 'three';

type Vec3 = [number, number, number];

export function HoodedFigure3D({
  position = [0, 0, 0] as Vec3,
  rotation = [0, 0, 0] as Vec3,
  color = '#0f1a2b',
  accent = '#c03838',
  scale = 1,
  dying = false,
  bobbing = false,
}: {
  position?: Vec3;
  rotation?: Vec3;
  color?: string;
  accent?: string;
  scale?: number;
  dying?: boolean;
  bobbing?: boolean;
}) {
  const group = useRef<Group>(null);
  const t0 = useRef(Math.random() * 10);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime + t0.current;
    if (bobbing) {
      group.current.position.y = position[1] + Math.sin(t * 1.6) * 0.04;
    }
    if (dying) {
      // Topple + fade: tilt forward over 1s then stay
      const target = Math.min(1, (t - t0.current) * 0.8);
      group.current.rotation.x = -target * 1.2;
      group.current.position.y = position[1] - target * 0.6;
    }
  });

  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      {/* cloak body — cone */}
      <mesh castShadow receiveShadow position={[0, 0.7, 0]}>
        <coneGeometry args={[0.55, 1.5, 24, 1, false]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0.05} />
      </mesh>
      {/* hood — spherical cap */}
      <mesh castShadow position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.42, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
        <meshStandardMaterial color={color} roughness={0.9} metalness={0.05} />
      </mesh>
      {/* face shadow */}
      <mesh position={[0, 1.42, 0.22]}>
        <sphereGeometry args={[0.26, 20, 20]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      {/* eyes */}
      <mesh position={[-0.09, 1.46, 0.44]}>
        <sphereGeometry args={[0.035, 10, 10]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      <mesh position={[0.09, 1.46, 0.44]}>
        <sphereGeometry args={[0.035, 10, 10]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      {/* clasp */}
      <mesh position={[0, 1.0, 0.42]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.4}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

export function Dagger3D({
  position = [0, 0, 0] as Vec3,
  rotation = [0, 0, 0] as Vec3,
  scale = 1,
}: {
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* blade */}
      <mesh castShadow position={[0, 0.5, 0]}>
        <coneGeometry args={[0.08, 0.9, 4]} />
        <meshStandardMaterial color="#dde3f0" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* bloodied tip */}
      <mesh position={[0, 0.85, 0]}>
        <coneGeometry args={[0.06, 0.3, 4]} />
        <meshStandardMaterial
          color="#c03838"
          emissive="#73181a"
          emissiveIntensity={0.4}
          roughness={0.5}
        />
      </mesh>
      {/* crossguard */}
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.42, 0.06, 0.1]} />
        <meshStandardMaterial color="#d4a63a" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* grip */}
      <mesh castShadow position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.4, 8]} />
        <meshStandardMaterial color="#3a2412" roughness={0.9} />
      </mesh>
      {/* pommel */}
      <mesh position={[0, -0.48, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial color="#d4a63a" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function Shield3D({
  position = [0, 0, 0] as Vec3,
  color = '#34d1a0',
  broken = false,
  scale = 1,
}: {
  position?: Vec3;
  color?: string;
  broken?: boolean;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <cylinderGeometry args={[0.6, 0.55, 0.12, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={broken ? 0.1 : 0.4}
          metalness={0.6}
          roughness={0.3}
          transparent
          opacity={broken ? 0.5 : 0.9}
        />
      </mesh>
      <mesh position={[0, 0, 0.08]}>
        <torusGeometry args={[0.55, 0.03, 12, 32]} />
        <meshStandardMaterial color="#d4a63a" metalness={0.9} roughness={0.2} />
      </mesh>
      {!broken && (
        <mesh position={[0, 0, 0.1]}>
          <torusGeometry args={[0.3, 0.02, 10, 24]} />
          <meshStandardMaterial color="#f3c969" metalness={0.9} roughness={0.2} />
        </mesh>
      )}
      {broken && (
        <>
          <mesh position={[-0.15, 0.1, 0.08]} rotation={[0, 0, 0.4]}>
            <boxGeometry args={[0.5, 0.04, 0.01]} />
            <meshStandardMaterial color="#06080f" />
          </mesh>
          <mesh position={[0.12, -0.05, 0.08]} rotation={[0, 0, -0.6]}>
            <boxGeometry args={[0.4, 0.04, 0.01]} />
            <meshStandardMaterial color="#06080f" />
          </mesh>
        </>
      )}
    </group>
  );
}

export function Magnifier3D({
  position = [0, 0, 0] as Vec3,
  scale = 1,
}: {
  position?: Vec3;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      {/* lens ring */}
      <mesh castShadow>
        <torusGeometry args={[0.4, 0.05, 12, 32]} />
        <meshStandardMaterial color="#d4a63a" metalness={0.9} roughness={0.25} />
      </mesh>
      {/* lens */}
      <mesh>
        <circleGeometry args={[0.38, 32]} />
        <meshStandardMaterial
          color="#7cc0ff"
          transparent
          opacity={0.25}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
      {/* handle */}
      <mesh castShadow position={[0.5, -0.5, 0]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.06, 0.06, 0.7, 10]} />
        <meshStandardMaterial color="#8b6418" roughness={0.8} />
      </mesh>
      {/* grip */}
      <mesh position={[0.75, -0.75, 0]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#4b2a1a" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function Trophy3D({
  position = [0, 0, 0] as Vec3,
  color = '#f3c969',
  scale = 1,
}: {
  position?: Vec3;
  color?: string;
  scale?: number;
}) {
  const t0 = useRef(0);
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = t * 0.3;
    group.current.position.y = position[1] + Math.sin(t * 1.3) * 0.08;
    t0.current = t;
  });
  return (
    <group ref={group} position={position} scale={scale}>
      {/* base */}
      <mesh castShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.7, 0.2, 20]} />
        <meshStandardMaterial color="#4b2a1a" roughness={0.8} />
      </mesh>
      {/* stem */}
      <mesh castShadow position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 0.6, 12]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.2} />
      </mesh>
      {/* cup */}
      <mesh castShadow position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.6, 0.3, 0.8, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>
      {/* handles */}
      <mesh position={[-0.6, 1.1, 0]}>
        <torusGeometry args={[0.2, 0.04, 10, 20, Math.PI]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.6, 1.1, 0]} rotation={[0, Math.PI, 0]}>
        <torusGeometry args={[0.2, 0.04, 10, 20, Math.PI]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

export function Ground({ color = '#0b1120' }: { color?: string }) {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <circleGeometry args={[8, 48]} />
      <meshStandardMaterial color={color} roughness={0.95} metalness={0.05} />
    </mesh>
  );
}

export function MoonLight() {
  return (
    <>
      <ambientLight intensity={0.25} color="#8ca3cc" />
      <directionalLight
        position={[5, 8, 3]}
        intensity={1.2}
        color="#bcd4ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <pointLight position={[-3, 3, -2]} intensity={0.4} color="#f3c969" />
    </>
  );
}

export function BloodBurst({
  position = [0, 1, 0] as Vec3,
  count = 40,
  seed = 1,
}: {
  position?: Vec3;
  count?: number;
  seed?: number;
}) {
  const group = useRef<Group>(null);
  const t0 = useRef<number | null>(null);

  // Pre-generate directions deterministically from seed
  const dirs = useRef<Array<[number, number, number]>>([]);
  if (dirs.current.length === 0) {
    let s = seed;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let i = 0; i < count; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(1 - 2 * rand());
      const r = 0.5 + rand() * 2.5;
      dirs.current.push([
        Math.sin(phi) * Math.cos(theta) * r,
        Math.cos(phi) * r + 1.5,
        Math.sin(phi) * Math.sin(theta) * r,
      ]);
    }
  }

  useFrame((state) => {
    if (!group.current) return;
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - t0.current;
    const children = group.current.children as Mesh[];
    for (let i = 0; i < children.length; i++) {
      const d = dirs.current[i]!;
      const prog = Math.min(1, t * 0.9);
      children[i]!.position.set(
        d[0] * prog,
        d[1] * prog - 4.5 * Math.pow(prog, 2),
        d[2] * prog,
      );
      const mat = children[i]!.material as THREE.MeshStandardMaterial;
      if (mat && 'opacity' in mat) {
        mat.transparent = true;
        mat.opacity = Math.max(0, 1 - prog);
      }
    }
  });

  return (
    <group ref={group} position={position}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.04 + (i % 3) * 0.015, 6, 6]} />
          <meshStandardMaterial
            color="#c03838"
            emissive="#73181a"
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}
