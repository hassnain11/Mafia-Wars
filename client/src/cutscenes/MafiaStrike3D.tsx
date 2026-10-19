import { useFrame } from '@react-three/fiber';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import type { Group } from 'three';
import { Scene } from '../three/Scene';
import {
  BloodBurst,
  Dagger3D,
  Ground,
  HoodedFigure3D,
  MoonLight,
} from '../three/figures3d';

function AnimatedDagger() {
  const group = useRef<Group>(null);
  const start = useRef<number | null>(null);
  useFrame((state) => {
    if (!group.current) return;
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - start.current;
    // Dagger swings from attacker (left) toward victim (right) between 0.6s and 1.8s.
    const prog = Math.max(0, Math.min(1, (t - 0.6) / 1.2));
    const x = -1.3 + prog * 2.6;
    const y = 1.5 + Math.sin(prog * Math.PI) * 0.8;
    const z = 0;
    const rotZ = -0.6 + prog * 1.6;
    group.current.position.set(x, y, z);
    group.current.rotation.set(0, 0, rotZ);
    // hide after swing
    group.current.visible = t < 2.0;
  });
  return (
    <group ref={group}>
      <Dagger3D scale={1.2} />
    </group>
  );
}

export function MafiaStrike3D({ victimName }: { victimName: string | null }) {
  if (!victimName) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <Scene height={320} camera={{ position: [0, 1.5, 5], fov: 42 }}>
          <MoonLight />
          <Ground />
          <HoodedFigure3D position={[0, 0, 0]} color="#1a1020" accent="#f3c969" bobbing scale={1.2} />
        </Scene>
        <div className="font-serif text-xl tracking-wide text-parchment-200/80">
          The town slept in peace.
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center">
      <Scene height={340} camera={{ position: [0, 1.8, 5.5], fov: 42 }}>
        <MoonLight />
        <Ground />
        {/* Attacker */}
        <HoodedFigure3D position={[-1.3, 0, 0]} color="#1a1020" accent="#c03838" />
        {/* Victim */}
        <HoodedFigure3D position={[1.3, 0, 0]} color="#1b2740" accent="#7cc0ff" dying />
        {/* Dagger animation */}
        <AnimatedDagger />
        {/* Blood burst — appears after dagger swing */}
        <DelayedBurst position={[1.3, 1.4, 0]} delay={1.9} />
      </Scene>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.3, duration: 0.5 }}
        className="mt-4 text-center space-y-1"
      >
        <div className="text-xs uppercase tracking-[0.3em] text-blood-500/80">Found at dawn</div>
        <motion.div
          initial={{ letterSpacing: '0.6em', opacity: 0.3 }}
          animate={{ letterSpacing: '0.15em', opacity: 1 }}
          transition={{ delay: 2.5, duration: 0.6 }}
          className="font-serif text-3xl font-bold text-parchment-100 relative inline-block"
        >
          {victimName}
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 3.0, duration: 0.5 }}
            className="absolute left-0 right-0 top-1/2 h-[2px] bg-blood-500 origin-left"
          />
        </motion.div>
        <div className="font-display italic text-parchment-200/70 pt-1">
          Lifeless. Cold. Silenced.
        </div>
      </motion.div>
    </div>
  );
}

function DelayedBurst({ position, delay }: { position: [number, number, number]; delay: number }) {
  const visible = useRef(false);
  const start = useRef<number | null>(null);
  useFrame((state) => {
    if (start.current === null) start.current = state.clock.elapsedTime;
    if (state.clock.elapsedTime - start.current > delay) visible.current = true;
  });
  if (!visible.current) return null;
  return <BloodBurst position={position} seed={42} count={30} />;
}
