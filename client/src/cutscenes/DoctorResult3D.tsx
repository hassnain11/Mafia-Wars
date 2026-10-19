import { useFrame } from '@react-three/fiber';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import type { Group } from 'three';
import { Scene } from '../three/Scene';
import { Ground, HoodedFigure3D, MoonLight, Shield3D } from '../three/figures3d';

function OrbitingShield({ broken }: { broken: boolean }) {
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = t * (broken ? 1.8 : 0.6);
    const pulse = broken ? 1 : 1 + Math.sin(t * 2.5) * 0.08;
    group.current.scale.set(pulse, pulse, pulse);
  });
  return (
    <group ref={group} position={[0, 1.3, 0]}>
      <Shield3D color={broken ? '#9aa6c2' : '#34d1a0'} broken={broken} scale={0.9} />
    </group>
  );
}

export function DoctorResult3D({
  doctorPresent,
  saved,
}: {
  doctorPresent: boolean;
  saved: boolean;
}) {
  if (!doctorPresent) {
    return (
      <div className="text-center font-display italic text-parchment-200/60 py-8">
        No healer walked the halls tonight.
      </div>
    );
  }

  const message = saved ? "The healer's shield held fast." : 'The healer arrived too late.';
  const color = saved ? '#34d1a0' : '#9aa6c2';

  return (
    <div className="flex flex-col items-center">
      <Scene height={300} camera={{ position: [0, 1.5, 5], fov: 42 }}>
        <MoonLight />
        <Ground />
        <HoodedFigure3D color="#102030" accent={color} bobbing scale={1.1} />
        <OrbitingShield broken={!saved} />
        {saved && (
          <pointLight position={[0, 1.5, 2]} color="#34d1a0" intensity={1.6} distance={5} />
        )}
      </Scene>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.5 }}
        className="mt-4 text-center space-y-1"
      >
        <div className="text-xs uppercase tracking-[0.3em] text-parchment-200/60">The Healer</div>
        <div className="font-serif text-2xl font-bold" style={{ color }}>
          {message}
        </div>
      </motion.div>
    </div>
  );
}
