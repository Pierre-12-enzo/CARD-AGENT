// components/marketing/three/HeroScene.jsx
// The R3F <Canvas>: navy environment, crimson lighting, Bloom glow, pointer parallax.
import React from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import FloatingCards from './FloatingCards';
import ParticleField from './ParticleField';

// Shared pointer ref so card group + camera both read it
const pointer = { current: { x: 0, y: 0 } };

// Camera rig: subtle parallax driven by pointer position
const CameraRig = () => {
  const { camera } = useThree();
  useFrame(() => {
    const targetX = pointer.current.x * 0.8;
    const targetY = -pointer.current.y * 0.5;
    camera.position.x += (targetX - camera.position.x) * 0.04;
    camera.position.y += (targetY - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
};

// Tracks normalized pointer (-1..1) into shared ref
const PointerTracker = () => {
  useFrame(({ pointer: p }) => {
    pointer.current.x = p.x;
    pointer.current.y = p.y;
  });
  // Pause rendering when tab hidden to save battery
  return null;
};

const HeroScene = () => {
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 0, 5.2], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => {}}
    >
      <PointerTracker />
      <CameraRig />

      {/* Lighting: low ambient + crimson key + cool rim */}
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 3, 4]} intensity={45} color="#dc2626" distance={14} decay={2} />
      <pointLight position={[-5, -2, 2]} intensity={20} color="#3b82f6" distance={12} decay={2} />
      <directionalLight position={[0, 4, 5]} intensity={0.6} color="#ffffff" />

      <group position={[0, -0.15, 0]}>
        <FloatingCards pointer={pointer} />
      </group>
      <ParticleField />

      <EffectComposer>
        <Bloom
          intensity={0.9}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.2} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
};

export default HeroScene;
