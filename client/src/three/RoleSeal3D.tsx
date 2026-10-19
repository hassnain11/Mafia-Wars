import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { ROLE, type Role } from '@mafia/shared';

const ROLE_HEX: Record<Role, string> = {
  [ROLE.MAFIA]: '#c03838',
  [ROLE.DOCTOR]: '#34d1a0',
  [ROLE.DETECTIVE]: '#7cc0ff',
  [ROLE.CIVILIAN]: '#f3c969',
};

export function RoleSeal3D({ role }: { role: Role }) {
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const core = useRef<Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (outer.current) outer.current.rotation.z = t * 0.3;
    if (inner.current) inner.current.rotation.z = -t * 0.5;
    if (core.current) {
      core.current.rotation.y = t * 0.8;
      core.current.position.y = Math.sin(t * 1.4) * 0.08;
    }
  });

  const color = ROLE_HEX[role];

  return (
    <>
      {/* back glow sphere */}
      <mesh position={[0, 0, -0.4]}>
        <sphereGeometry args={[1.6, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.05} />
      </mesh>

      {/* outer ring */}
      <group ref={outer}>
        <mesh castShadow>
          <torusGeometry args={[1.2, 0.04, 16, 48]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.8}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        {/* 4 studs on outer ring */}
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos((i * Math.PI) / 2) * 1.2,
              Math.sin((i * Math.PI) / 2) * 1.2,
              0,
            ]}
          >
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial color="#f3c969" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
      </group>

      {/* middle ring */}
      <group ref={inner}>
        <mesh castShadow>
          <torusGeometry args={[0.85, 0.03, 14, 40]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* core medallion */}
      <group ref={core}>
        <mesh castShadow>
          <cylinderGeometry args={[0.5, 0.5, 0.1, 24]} />
          <meshStandardMaterial
            color="#06080f"
            emissive={color}
            emissiveIntensity={0.3}
            metalness={0.5}
            roughness={0.4}
          />
        </mesh>
        {/* raised rim on medallion */}
        <mesh position={[0, 0.06, 0]}>
          <torusGeometry args={[0.5, 0.03, 10, 24]} />
          <meshStandardMaterial color={color} metalness={0.9} roughness={0.2} />
        </mesh>
        {/* role glyph — stylized shapes */}
        <RoleGlyph role={role} color={color} />
      </group>

      {/* spot light highlight */}
      <pointLight position={[2, 2, 2]} intensity={1.0} color={color} distance={6} />
    </>
  );
}

function RoleGlyph({ role, color }: { role: Role; color: string }) {
  if (role === ROLE.MAFIA) {
    // dagger shape
    return (
      <>
        <mesh position={[0, 0.1, 0]}>
          <coneGeometry args={[0.08, 0.35, 4]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[0.25, 0.04, 0.05]} />
          <meshStandardMaterial color="#f3c969" metalness={0.9} roughness={0.2} />
        </mesh>
      </>
    );
  }
  if (role === ROLE.DOCTOR) {
    // cross
    return (
      <>
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.08, 0.3, 0.04]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.3, 0.08, 0.04]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
      </>
    );
  }
  if (role === ROLE.DETECTIVE) {
    // magnifier
    return (
      <>
        <mesh position={[-0.05, 0.08, 0]}>
          <torusGeometry args={[0.14, 0.025, 10, 20]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0.12, -0.08, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.03, 0.2, 0.03]} />
          <meshStandardMaterial color="#f3c969" metalness={0.8} roughness={0.3} />
        </mesh>
      </>
    );
  }
  // civilian — torch/lantern
  return (
    <>
      <mesh position={[0, 0.1, 0]}>
        <coneGeometry args={[0.1, 0.2, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.2, 8]} />
        <meshStandardMaterial color="#4b2a1a" />
      </mesh>
    </>
  );
}
