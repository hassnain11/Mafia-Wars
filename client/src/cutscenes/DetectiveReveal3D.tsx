import { useFrame } from '@react-three/fiber';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import type { Group } from 'three';
import { Scene } from '../three/Scene';
import { Ground, HoodedFigure3D, Magnifier3D, MoonLight } from '../three/figures3d';

function SwingingMagnifier() {
  const group = useRef<Group>(null);
  const start = useRef<number | null>(null);
  useFrame((state) => {
    if (!group.current) return;
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - start.current;
    const prog = Math.max(0, Math.min(1, t / 1.2));
    const angle = -0.9 + prog * 1.1;
    group.current.position.set(-1.5 + prog * 1.5, 1.4, 0.5);
    group.current.rotation.z = angle;
  });
  return (
    <group ref={group}>
      <Magnifier3D scale={0.8} />
    </group>
  );
}

export function DetectiveReveal3D({
  targetName,
  isMafia,
}: {
  targetName: string;
  isMafia: boolean;
}) {
  const color = isMafia ? '#c03838' : '#34d1a0';
  const verdict = isMafia ? 'A Traitor among us.' : 'An honest soul.';

  return (
    <div className="relative flex flex-col items-center">
      <Scene height={300} camera={{ position: [0, 1.5, 5], fov: 42 }}>
        <MoonLight />
        <Ground />
        <HoodedFigure3D color="#0f1a2b" accent="#7cc0ff" bobbing scale={1.1} />
        <SwingingMagnifier />
        <pointLight position={[0, 2, 2]} color={color} intensity={1.4} distance={6} />
      </Scene>

      <motion.div
        initial={{ opacity: 0, scale: 1.5, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: -5 }}
        transition={{ delay: 1.3, type: 'spring', stiffness: 180, damping: 14 }}
        className="-mt-20 mb-4 relative z-10"
      >
        <div
          className="px-5 py-2 border-4 font-serif font-black tracking-[0.3em] text-xl uppercase"
          style={{
            borderColor: color,
            color,
            boxShadow: `0 0 20px ${color}60`,
            background: 'rgba(6,8,15,0.75)',
          }}
        >
          {isMafia ? 'Mafia' : 'Innocent'}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.5 }}
        className="text-center space-y-1"
      >
        <div className="text-xs uppercase tracking-[0.3em] text-sky-400/80">For your eyes only</div>
        <div className="font-serif text-2xl font-bold text-parchment-100">{targetName}</div>
        <div className="font-display italic" style={{ color }}>
          {verdict}
        </div>
      </motion.div>
    </div>
  );
}
