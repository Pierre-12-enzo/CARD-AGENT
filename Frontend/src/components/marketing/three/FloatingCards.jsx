// components/marketing/three/FloatingCards.jsx
// Floating ID-card meshes that gently bob, orbit, and lean toward the pointer.
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';

// Card aspect ratio ~ 1.586 (standard ID card / credit card)
const CARD_W = 1.586;
const CARD_H = 1;

// Layout each card at a hand-tuned position + facing direction
const LAYOUT = [
  { pos: [-2.1, 0.4, 0.0], rot: [0.0, 0.42, -0.12], accent: '#dc2626', name: 'EST. 2024', role: 'STUDENT' },
  { pos: [0.0, -0.2, 0.6], rot: [0.05, 0.0, 0.04], accent: '#ef4444', name: 'CAP_mis', role: 'EMPLOYEE' },
  { pos: [2.1, 0.5, -0.2], rot: [0.0, -0.42, 0.1], accent: '#f87171', name: 'ID PRO', role: 'STAFF' },
];

// A single card: glass body + crimson neon edge + minimal "printed" details
const Card = ({ position, rotation, accent, name, role, index, pointer }) => {
  const group = useRef();

  // Per-card phase so they don't bob in sync
  const phase = useMemo(() => index * 1.7, [index]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!group.current) return;

    // Gentle vertical bob + slow orbit drift
    group.current.position.y = position[1] + Math.sin(t * 0.8 + phase) * 0.12;
    group.current.rotation.z = rotation[2] + Math.sin(t * 0.5 + phase) * 0.03;

    // Lean slightly toward the pointer for parallax life
    const targetY = rotation[1] + pointer.current.x * 0.25;
    const targetX = rotation[0] + -pointer.current.y * 0.18;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.05;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.05;
  });

  return (
    <group ref={group} position={position} rotation={rotation}>
      {/* Card body — dark glass with rounded corners */}
      <RoundedBox args={[CARD_W, CARD_H, 0.04]} radius={0.06} smoothness={4} castShadow>
        <meshStandardMaterial
          color="#0b1120"
          metalness={0.4}
          roughness={0.25}
          emissive="#1e293b"
          emissiveIntensity={0.25}
        />
      </RoundedBox>

      {/* Crimson neon edge — a slightly larger plane behind, additive glow */}
      <mesh position={[0, 0, -0.025]}>
        <planeGeometry args={[CARD_W + 0.04, CARD_H + 0.04]} />
        <meshBasicMaterial color={accent} transparent opacity={0.35} side={THREE.BackSide} />
      </mesh>

      {/* Photo placeholder chip (top-left) */}
      <mesh position={[-CARD_W / 2 + 0.3, CARD_H / 2 - 0.28, 0.025]}>
        <planeGeometry args={[0.34, 0.4]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} />
      </mesh>

      {/* Brand label */}
      <Text
        position={[0.05, CARD_H / 2 - 0.22, 0.025]}
        fontSize={0.085}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.12}
      >
        {name}
      </Text>

      {/* Role line */}
      <Text
        position={[-CARD_W / 2 + 0.05, -CARD_H / 2 + 0.16, 0.025]}
        fontSize={0.06}
        color="#f87171"
        anchorX="left"
        anchorY="middle"
      >
        {role}
      </Text>

      {/* Faux barcode lines */}
      <group position={[CARD_W / 2 - 0.28, -CARD_H / 2 + 0.18, 0.025]}>
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh key={i} position={[i * 0.025 - 0.1, 0, 0]}>
            <planeGeometry args={[0.006 + (i % 3) * 0.005, 0.16]} />
            <meshBasicMaterial color="#e2e8f0" transparent opacity={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const FloatingCards = ({ pointer }) => {
  return (
    <group position={[0, 0.1, 0]}>
      {LAYOUT.map((c, i) => (
        <Card key={i} index={i} pointer={pointer} {...c} />
      ))}
    </group>
  );
};

export default FloatingCards;
