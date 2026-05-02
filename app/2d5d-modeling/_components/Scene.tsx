"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import type { FaceModel } from "../_lib/types";
import { HeadMesh } from "./HeadMesh";
import { Parts } from "./Parts";

interface Props {
  model: FaceModel;
  showAxes: boolean;
  showGrid: boolean;
  // Called every frame with the current camera (yaw, pitch) in degrees.
  // yaw=0 means the camera looks at the face from +Z (front view).
  // pitch=0 means the camera is on the equator (eye level).
  onCameraChange?: (yaw: number, pitch: number) => void;
}

export const Scene = ({ model, showAxes, showGrid, onCameraChange }: Props) => {
  // Reactive ref for <Parts/> so it knows when the head mesh becomes available.
  const headMeshRef = useRef<THREE.Mesh | null>(null);
  const [headMesh, setHeadMesh] = useState<THREE.Mesh | null>(null);
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);

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
      <Parts parts={model.parts} headMesh={headMesh} yaw={yaw} pitch={pitch} />

      {showAxes && <axesHelper args={[1.5]} />}
      {showGrid && <gridHelper args={[4, 8]} />}

      <OrbitControls makeDefault enableDamping />
      <CameraTracker
        onChange={(y, p) => {
          setYaw(y);
          setPitch(p);
          onCameraChange?.(y, p);
        }}
      />
    </Canvas>
  );
};

// Reads the camera's spherical position relative to the origin every frame and
// reports it as (yaw, pitch) in degrees. yaw rotates around +Y; pitch is the
// elevation above the horizon.
const CameraTracker = ({
  onChange,
}: {
  onChange: (yaw: number, pitch: number) => void;
}) => {
  const lastYaw = useRef<number>(Number.NaN);
  const lastPitch = useRef<number>(Number.NaN);
  useFrame(({ camera }) => {
    const dir = camera.position.clone().normalize();
    // yaw: angle around +Y axis from +Z toward +X.
    const yawRad = Math.atan2(dir.x, dir.z);
    // pitch: elevation above the XZ plane.
    const pitchRad = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
    const yawDeg = (yawRad * 180) / Math.PI;
    const pitchDeg = (pitchRad * 180) / Math.PI;
    // Skip updates that don't move the angle meaningfully (avoid re-render
    // storm under OrbitControls damping).
    if (
      Math.abs(yawDeg - lastYaw.current) < 0.05 &&
      Math.abs(pitchDeg - lastPitch.current) < 0.05
    ) {
      return;
    }
    lastYaw.current = yawDeg;
    lastPitch.current = pitchDeg;
    onChange(yawDeg, pitchDeg);
  });
  return null;
};
