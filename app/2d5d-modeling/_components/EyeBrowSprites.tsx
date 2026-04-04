"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Keyframe, SpritePosition } from "./types";
import { interpolateKeyframes } from "./types";

/** 顔の基準位置（ワールド座標、HeadModelのセンタリング後） */
const FACE_CENTER = new THREE.Vector3(0, 0, 0);

/** 顔前面までの浮き量（原点から顔表面までの距離 + 少し手前） */
const FACE_Z_OFFSET = 0.115;

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
 * カメラの右方向・上方向ベクトルでオフセットし、
 * 前方向に固定の浮き量を加えてワールド座標を得る。
 * 全ての距離基準をカメラ→原点にし、回転でサイズが変わらないようにする。
 */
function cameraLocalToWorld(
  pos: SpritePosition,
  camera: THREE.Camera,
): { worldPos: THREE.Vector3; distScale: number } {
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const forward = new THREE.Vector3();

  const worldUp = new THREE.Vector3(0, 1, 0);
  camera.getWorldDirection(forward);
  right.crossVectors(forward, worldUp).normalize();
  up.crossVectors(right, forward).normalize();

  // カメラ→原点の距離に互換係数を掛けたものを全ての基準にする
  const dist = camera.position.length() * SCALE_COMPAT;

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
  // パース補正: スプライトの実距離/原点距離で回転による見た目の変化を打ち消す
  // distScaleにはズーム情報が含まれるのでズームには追従する
  const distToOrigin = camera.position.length();
  const distToSprite = camera.position.distanceTo(worldPos);
  const perspRatio = distToSprite / distToOrigin;
  const s = Math.max(pos.scale * distScale * perspRatio, 0.002);
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
