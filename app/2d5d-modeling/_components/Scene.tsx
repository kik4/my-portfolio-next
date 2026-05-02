"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useRef, useState } from "react";
import type * as THREE from "three";
import type { FaceModel } from "../_lib/types";
import { HeadMesh } from "./HeadMesh";
import { Parts } from "./Parts";

interface Props {
  model: FaceModel;
  showAxes: boolean;
  showGrid: boolean;
}

export const Scene = ({ model, showAxes, showGrid }: Props) => {
  // We need the head mesh ref to be reactive for <Parts/> to know when it's available.
  const headMeshRef = useRef<THREE.Mesh | null>(null);
  const [headMesh, setHeadMesh] = useState<THREE.Mesh | null>(null);

  return (
    <Canvas
      camera={{ position: [0, 0.2, 3], fov: 35, near: 0.01, far: 100 }}
      shadows={false}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 4]} intensity={0.8} />

      <HeadMesh
        head={model.head}
        ref={(mesh) => {
          headMeshRef.current = mesh;
          if (mesh !== headMesh) setHeadMesh(mesh);
        }}
      />
      <Parts parts={model.parts} headMesh={headMesh} />

      {showAxes && <axesHelper args={[1.5]} />}
      {showGrid && <gridHelper args={[4, 8]} />}

      <OrbitControls makeDefault enableDamping />
    </Canvas>
  );
};
