"use client";

import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { FaceModel } from "../_lib/types";
import { FaceMesh } from "./FaceMesh";

interface SceneProps {
  model: FaceModel;
  faceOpacity: number;
  zoom: number;
  onAngleChange: (yaw: number, pitch: number) => void;
  onZoomChange: (zoom: number) => void;
}

const CAMERA_DISTANCE = 1;

export function Scene({
  model,
  faceOpacity,
  zoom,
  onAngleChange,
  onZoomChange,
}: SceneProps) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <OrthographicCamera
        makeDefault
        position={[0, 0, CAMERA_DISTANCE]}
        zoom={zoom}
        near={0.01}
        far={10}
      />
      <OrbitControls
        enablePan={false}
        target={[0, 0, 0]}
        onChange={(e) => {
          if (!e) return;
          const cam = e.target.object as THREE.OrthographicCamera;
          const dir = new THREE.Vector3();
          cam.getWorldDirection(dir).negate();
          const yaw = (Math.atan2(dir.x, dir.z) * 180) / Math.PI;
          const pitch = (Math.asin(dir.y) * 180) / Math.PI;
          onAngleChange(yaw, pitch);
          if (cam.zoom !== zoom) {
            onZoomChange(cam.zoom);
          }
        }}
      />
      <ambientLight intensity={2.5} />
      <FaceMesh model={model} opacity={faceOpacity} />
    </Canvas>
  );
}
