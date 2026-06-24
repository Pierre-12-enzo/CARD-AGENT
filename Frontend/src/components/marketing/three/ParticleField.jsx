// components/marketing/three/ParticleField.jsx
// Ambient drifting particle field for hero depth.
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as mas from 'maath/random';

const ParticleField = ({ count = 1200, radius = 9 }) => {
  const pointsRef = useRef();

  // Distribute points in a flattened sphere so they cluster around the hero
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    mas.inSphere(arr, { radius, edges: false });
    // Flatten slightly on Y for a wide cinematic spread
    for (let i = 1; i < arr.length; i += 3) arr[i] *= 0.6;
    return arr;
  }, [count, radius]);

  // Gentle rotation each frame
  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.03;
    pointsRef.current.rotation.x += delta * 0.01;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#f87171"
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default ParticleField;
