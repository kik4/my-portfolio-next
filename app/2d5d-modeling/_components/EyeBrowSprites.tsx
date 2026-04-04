"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Keyframe, SpritePosition } from "./types";
import { interpolateKeyframes } from "./types";

/** 顔の基準位置（モデルローカル座標、顔前面） */
const FACE_CENTER = new THREE.Vector3(0, 1.548, 0.075);

/** 顔表面からの固定浮き量 */
const FACE_Z_OFFSET = 0.005;

function Billboard({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

/**
 * カメラの右方向・上方向ベクトルでオフセットし、
 * 前方向に固定の浮き量を加えてワールド座標を得る
 */
function cameraLocalToWorld(
  pos: SpritePosition,
  camera: THREE.Camera,
): { worldPos: THREE.Vector3; distScale: number } {
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const forward = new THREE.Vector3();

  camera.getWorldDirection(forward);
  right.crossVectors(forward, camera.up).normalize();
  up.crossVectors(right, forward).normalize();

  const dist = camera.position.distanceTo(FACE_CENTER);

  const worldPos = FACE_CENTER.clone()
    .add(right.clone().multiplyScalar(pos.x * dist))
    .add(up.clone().multiplyScalar(pos.y * dist))
    .add(forward.clone().multiplyScalar(-FACE_Z_OFFSET));

  return { worldPos, distScale: dist };
}

function OffsetMaterial({
  color,
  offsetFactor,
  opacity = 1,
}: {
  color: string;
  offsetFactor: number;
  opacity?: number;
}) {
  return (
    <meshBasicMaterial
      color={color}
      side={THREE.DoubleSide}
      transparent
      opacity={opacity}
      depthTest
      polygonOffset
      polygonOffsetFactor={offsetFactor}
      polygonOffsetUnits={offsetFactor}
    />
  );
}

function EyeSprite({
  pos,
  camera,
  mirror,
}: {
  pos: SpritePosition;
  camera: THREE.Camera;
  mirror?: boolean;
}) {
  const { worldPos, distScale } = cameraLocalToWorld(pos, camera);
  const rot = (pos.rotation * Math.PI) / 180;
  const s = Math.max(pos.scale * distScale, 0.002);
  const sx = s * (pos.scaleX ?? 1);
  const offsetFactor = -(pos.depthOffset ?? 0) * 10000000;
  const highlightX = mirror ? -0.1 : 0.1;

  return (
    <group position={worldPos.toArray()}>
      <Billboard>
        <mesh rotation={[0, 0, rot]} scale={[sx, s, 1]}>
          <planeGeometry args={[1, 1]} />
          <OffsetMaterial
            color="#2a2a5a"
            offsetFactor={offsetFactor}
            opacity={0.9}
          />
          <mesh position={[0, -0.05, 0.001]}>
            <circleGeometry args={[0.25, 32]} />
            <OffsetMaterial color="#4488cc" offsetFactor={offsetFactor} />
          </mesh>
          <mesh position={[0, -0.05, 0.002]}>
            <circleGeometry args={[0.12, 32]} />
            <OffsetMaterial color="#111111" offsetFactor={offsetFactor} />
          </mesh>
          <mesh position={[highlightX, 0.05, 0.003]}>
            <circleGeometry args={[0.08, 16]} />
            <OffsetMaterial color="#ffffff" offsetFactor={offsetFactor} />
          </mesh>
        </mesh>
      </Billboard>
    </group>
  );
}

interface EyeBrowSpritesProps {
  keyframes: Keyframe[];
  onAngleChange: (angle: { h: number; v: number }) => void;
}

export function EyeBrowSprites({
  keyframes,
  onAngleChange,
}: EyeBrowSpritesProps) {
  const { camera } = useThree();
  const hRef = useRef(0);
  const vRef = useRef(0);

  useFrame(() => {
    const pos = camera.position;
    const h = Math.abs(Math.atan2(pos.x, pos.z)) * (180 / Math.PI);
    const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    const v = Math.atan2(pos.y, dist) * (180 / Math.PI);
    if (Math.abs(h - hRef.current) > 0.5 || Math.abs(v - vRef.current) > 0.5) {
      hRef.current = h;
      vRef.current = v;
      onAngleChange({ h, v });
    }
  });

  const current = interpolateKeyframes(keyframes, hRef.current);

  return (
    <group>
      <EyeSprite pos={current.leftEye} camera={camera} />
      <EyeSprite pos={current.rightEye} camera={camera} mirror />
    </group>
  );
}
