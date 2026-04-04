"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
  autoRotate: boolean;
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
  autoRotate,
}: {
  fixedAngle: { h: number; v: number } | null;
  fov: number;
  autoRotate: boolean;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const autoAngleRef = useRef(0);
  const autoDirectionRef = useRef(1); // 1=正方向, -1=逆方向

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

  useFrame((_, delta) => {
    if (!autoRotate || !controlsRef.current) return;
    const speed = 30; // 度/秒
    autoAngleRef.current += speed * delta * autoDirectionRef.current;
    if (autoAngleRef.current >= 180) {
      autoAngleRef.current = 180;
      autoDirectionRef.current = -1;
    } else if (autoAngleRef.current <= 0) {
      autoAngleRef.current = 0;
      autoDirectionRef.current = 1;
    }
    const distance = camera.position.length();
    const hRad = (autoAngleRef.current * Math.PI) / 180;
    camera.position.set(
      Math.sin(hRad) * distance,
      camera.position.y,
      Math.cos(hRad) * distance,
    );
    controlsRef.current.update();
  });

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
  autoRotate,
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
          <HeadModel url={modelUrl} />
        </Suspense>

        <EyeBrowSprites keyframes={keyframes} onAngleChange={onAngleChange} />

        <CameraController
          fixedAngle={fixedAngle}
          fov={fov}
          autoRotate={autoRotate}
        />
      </Canvas>
    </div>
  );
}
