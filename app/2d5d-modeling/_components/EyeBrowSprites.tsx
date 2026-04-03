"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Keyframe, SpritePosition } from "./types";
import { interpolateKeyframes } from "./types";

/** 顔の基準位置（モデルローカル座標、顔前面） */
const FACE_CENTER = new THREE.Vector3(0, 1.548, 0.075);

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
 * カメラローカル座標からワールド座標に変換
 * カメラの右方向・上方向・前方向をベースに、顔の基準位置からオフセット
 */
function cameraLocalToWorld(
  pos: SpritePosition,
  camera: THREE.Camera,
): THREE.Vector3 {
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const forward = new THREE.Vector3();

  camera.getWorldDirection(forward);
  right.crossVectors(forward, camera.up).normalize();
  up.crossVectors(right, forward).normalize();

  return FACE_CENTER.clone()
    .add(right.multiplyScalar(pos.x))
    .add(up.multiplyScalar(pos.y))
    .add(forward.multiplyScalar(-pos.z)); // zは手前が正なので反転
}

function SpriteItem({
  worldPos,
  scale,
  rotation,
  color,
  children,
}: {
  worldPos: THREE.Vector3;
  scale: number;
  rotation: number;
  color: string;
  children?: React.ReactNode;
}) {
  const rot = (rotation * Math.PI) / 180;
  const s = Math.max(scale, 0.002);

  return (
    <group position={[worldPos.x, worldPos.y, worldPos.z]}>
      <Billboard>
        <mesh rotation={[0, 0, rot]} scale={[s, s, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color={color}
            side={THREE.DoubleSide}
            transparent
            opacity={0.9}
          />
          {children}
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

  const leftEyeWorld = cameraLocalToWorld(current.leftEye, camera);
  const rightEyeWorld = cameraLocalToWorld(current.rightEye, camera);
  const leftBrowWorld = cameraLocalToWorld(current.leftBrow, camera);
  const rightBrowWorld = cameraLocalToWorld(current.rightBrow, camera);

  return (
    <group>
      {/* 左目 */}
      <SpriteItem
        worldPos={leftEyeWorld}
        scale={current.leftEye.scale}
        rotation={current.leftEye.rotation}
        color="#2a2a5a"
      >
        <mesh position={[0, -0.05, 0.001]}>
          <circleGeometry args={[0.25, 32]} />
          <meshBasicMaterial color="#4488cc" />
        </mesh>
        <mesh position={[0, -0.05, 0.002]}>
          <circleGeometry args={[0.12, 32]} />
          <meshBasicMaterial color="#111111" />
        </mesh>
        <mesh position={[0.1, 0.05, 0.003]}>
          <circleGeometry args={[0.08, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </SpriteItem>

      {/* 右目 */}
      <SpriteItem
        worldPos={rightEyeWorld}
        scale={current.rightEye.scale}
        rotation={current.rightEye.rotation}
        color="#2a2a5a"
      >
        <mesh position={[0, -0.05, 0.001]}>
          <circleGeometry args={[0.25, 32]} />
          <meshBasicMaterial color="#4488cc" />
        </mesh>
        <mesh position={[0, -0.05, 0.002]}>
          <circleGeometry args={[0.12, 32]} />
          <meshBasicMaterial color="#111111" />
        </mesh>
        <mesh position={[-0.1, 0.05, 0.003]}>
          <circleGeometry args={[0.08, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </SpriteItem>

      {/* 左眉 */}
      <SpriteItem
        worldPos={leftBrowWorld}
        scale={current.leftBrow.scale}
        rotation={current.leftBrow.rotation}
        color="#3a2a1a"
      />

      {/* 右眉 */}
      <SpriteItem
        worldPos={rightBrowWorld}
        scale={current.rightBrow.scale}
        rotation={current.rightBrow.rotation}
        color="#3a2a1a"
      />
    </group>
  );
}
