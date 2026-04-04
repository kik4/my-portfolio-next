"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { CrossSectionWires, LoftMesh } from "./LoftMesh";
import type { CrossSection } from "./types";

interface ViewportProps {
  sections: CrossSection[];
}

export function Viewport({ sections }: ViewportProps) {
  return (
    <div className="flex-1 bg-gray-300">
      <Canvas
        camera={{ position: [0, 0, 2], fov: 45 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#d0d0d0"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 4]} intensity={0.8} />

        <LoftMesh sections={sections} steps={48} />
        <CrossSectionWires sections={sections} />

        <OrbitControls enablePan minDistance={0.5} maxDistance={10} />
        <gridHelper args={[4, 20, "#bbb", "#ddd"]} />
        <axesHelper args={[1]} />
      </Canvas>
    </div>
  );
}
