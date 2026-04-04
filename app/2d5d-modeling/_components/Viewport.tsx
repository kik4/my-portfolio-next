"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { EyeBrowSprites } from "./EyeBrowSprites";
import { HeadModel } from "./HeadModel";
import type { Keyframe } from "./types";

interface ViewportProps {
  modelUrl: string;
  keyframes: Keyframe[];
  fixedAngle: { h: number; v: number } | null;
  fov: number;
  onAngleChange: (angle: { h: number; v: number }) => void;
}

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="#cccccc" wireframe />
    </mesh>
  );
}

function CameraController({
  fixedAngle,
  fov,
}: {
  fixedAngle: { h: number; v: number } | null;
  fov: number;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (fixedAngle === null || !controlsRef.current) return;
    const distance = camera.position.length();
    const hRad = (fixedAngle.h * Math.PI) / 180;
    const vRad = (fixedAngle.v * Math.PI) / 180;
    camera.position.set(
      Math.sin(hRad) * Math.cos(vRad) * distance,
      Math.sin(vRad) * distance,
      Math.cos(hRad) * Math.cos(vRad) * distance,
    );
    controlsRef.current.update();
  }, [fixedAngle, camera]);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [fov, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, 0, 0]}
      minDistance={0.1}
      maxDistance={4}
      enablePan={false}
    />
  );
}

export function Viewport({
  modelUrl,
  keyframes,
  fixedAngle,
  fov,
  onAngleChange,
}: ViewportProps) {
  return (
    <div className="flex-1 bg-gray-300">
      <Canvas
        camera={{ position: [0, 0, 0.35], fov: 45 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#d0d0d0"]} />
        <ambientLight intensity={2.5} />

        <Suspense fallback={<LoadingFallback />}>
          <HeadModel url={modelUrl}>
            <EyeBrowSprites
              keyframes={keyframes}
              onAngleChange={onAngleChange}
            />
          </HeadModel>
        </Suspense>

        <CameraController fixedAngle={fixedAngle} fov={fov} />
      </Canvas>
    </div>
  );
}
