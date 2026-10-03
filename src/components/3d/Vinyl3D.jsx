import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cylinder } from '@react-three/drei';

export function Vinyl3D({ isPlaying = true }) {
  const meshRef = useRef();

  useFrame((_, delta) => {
    if (meshRef.current && isPlaying) {
      meshRef.current.rotation.y += delta * 0.8;
    }
  });

  return (
    <group ref={meshRef} rotation={[0.4, 0, 0]}>
      {/* Disco Principal */}
      <Cylinder args={[2.5, 2.5, 0.05, 64]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#111115" roughness={0.2} metalness={0.8} />
      </Cylinder>

      {/* Ranhuras do Vinil */}
      <Cylinder args={[2.2, 2.2, 0.06, 64]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#1a1a24" roughness={0.4} metalness={0.6} />
      </Cylinder>

      {/* Rótulo Central Neon */}
      <Cylinder args={[0.9, 0.9, 0.07, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#00ff66" emissive="#00ff66" emissiveIntensity={0.6} />
      </Cylinder>

      {/* Furo Central */}
      <Cylinder args={[0.15, 0.15, 0.08, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#08090d" />
      </Cylinder>
    </group>
  );
}