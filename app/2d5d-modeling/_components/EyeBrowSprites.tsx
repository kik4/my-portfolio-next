"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Keyframe, SpritePosition } from "./types";
import { interpolateKeyframes } from "./types";

/** モデルの顔の基準位置（ワールド座標、センタリング後の顔前面） */
const FACE_ORIGIN = new THREE.Vector3(0, 0.005, 0.109);

/** 元データとのスケール互換係数 */
const SCALE_COMPAT = 4.5;

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
 * FACE_ORIGINを基準に、カメラのright/upベクトルでオフセットする。
 * スケール基準はカメラ→FACE_ORIGIN距離（パン・ズームで正しく追従）。
 * パース補正でカメラ→スプライト実距離を使い、回転でのサイズ変化を打ち消す。
 */
function spriteWorldPos(
  pos: SpritePosition,
  camera: THREE.Camera,
): { worldPos: THREE.Vector3; scaleBase: number } {
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const forward = new THREE.Vector3();

  const worldUp = new THREE.Vector3(0, 1, 0);
  camera.getWorldDirection(forward);
  right.crossVectors(forward, worldUp).normalize();
  up.crossVectors(right, forward).normalize();

  // オフセット量はFACE_ORIGINまでの距離で計算（位置の正確さのため）
  const distToFace = camera.position.distanceTo(FACE_ORIGIN);

  const worldPos = FACE_ORIGIN.clone()
    .add(right.clone().multiplyScalar(pos.x * distToFace))
    .add(up.clone().multiplyScalar(pos.y * distToFace))
    .add(forward.clone().multiplyScalar(-0.005));

  // スケール基準: カメラ→スプライト実距離（パースで自然にズームに追従し、回転でも正しい）
  const distToSprite = camera.position.distanceTo(worldPos);

  return { worldPos, scaleBase: distToSprite };
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
  const { worldPos, scaleBase } = spriteWorldPos(pos, camera);
  const rot = (pos.rotation * Math.PI) / 180;
  const s = Math.max(pos.scale * scaleBase * SCALE_COMPAT, 0.002);
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
  const notifiedHRef = useRef(0);
  const notifiedVRef = useRef(0);

  useFrame(() => {
    const pos = camera.position;
    const h = Math.abs(Math.atan2(pos.x, pos.z)) * (180 / Math.PI);
    const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    const v = Math.atan2(pos.y, dist) * (180 / Math.PI);
    // 描画用は毎フレーム更新
    hRef.current = h;
    vRef.current = v;
    // UI通知は閾値付き
    if (
      Math.abs(h - notifiedHRef.current) > 0.5 ||
      Math.abs(v - notifiedVRef.current) > 0.5
    ) {
      notifiedHRef.current = h;
      notifiedVRef.current = v;
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
