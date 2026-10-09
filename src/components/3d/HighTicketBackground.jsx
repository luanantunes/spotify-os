import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';

export function HighTicketBackground() {
  const sphereRef = useRef();

  useFrame((state) => {
    const clock = state.clock;
    if (sphereRef.current) {
      sphereRef.current.rotation.x = clock.getElapsedTime() * 0.15;
      sphereRef.current.rotation.y = clock.getElapsedTime() * 0.2;
    }
  });

  return (
    <group>
      {/* Esfera 3D fluida e futurista no centro/fundo */}
      <Sphere ref={sphereRef} args={[2.2, 64, 64]} position={[0, 0, -1]}>
        <MeshDistortMaterial
          color="#10b981" // Verde esmeralda Spotify refinado
          attach="material"
          distort={0.45}
          speed={2}
          roughness={0.2}
          metalness={0.8}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </Sphere>

      {/* Luzes direcionais para criar reflexos metálicos */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={2} color="#00f0ff" />
      <pointLight position={[-10, -10, -10]} intensity={1.5} color="#10b981" />
    </group>
  );
}