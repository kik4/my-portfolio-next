"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { AutoOffsetParams, BrowParams, EyeParams } from "./types";
import { FACE_BASE_Y, FACE_FRONT_Z } from "./types";

/**
 * 自動オフセットを計算
 */
function computeAutoOffset(
  angleDeg: number,
  autoOffset: AutoOffsetParams,
  side: "left" | "right",
) {
  if (!autoOffset.enabled)
    return { hOffset: 0, scaleOffset: 0, spacingOffset: 0 };

  const t = Math.min(angleDeg / 90, 1);
  const sideSign = side === "left" ? 1 : -1;
  const hOffset = t * autoOffset.horizontalStrength * sideSign * 0.005;
  const scaleOffset = -t * autoOffset.scaleStrength * 0.01;
  const spacingOffset = -t * autoOffset.spacingStrength * 0.005;

  return { hOffset, scaleOffset, spacingOffset };
}

interface EyeBrowSpritesProps {
  eyeParams: EyeParams;
  browParams: BrowParams;
  autoOffset: AutoOffsetParams;
  onAngleChange: (angle: { h: number; v: number }) => void;
}

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

function EyeSprite({
  side,
  eyeParams,
  autoOffset,
  angleDeg,
}: {
  side: "left" | "right";
  eyeParams: EyeParams;
  autoOffset: AutoOffsetParams;
  angleDeg: number;
}) {
  const sideSign = side === "left" ? -1 : 1;

  const auto = computeAutoOffset(angleDeg, autoOffset, side);

  const x =
    sideSign * (eyeParams.spacing + auto.spacingOffset) +
    eyeParams.horizontalOffset +
    auto.hOffset;
  const y = FACE_BASE_Y + eyeParams.verticalOffset;
  const z = FACE_FRONT_Z;
  const scale = Math.max(eyeParams.scale + auto.scaleOffset, 0.002);
  const rot = eyeParams.rotation * (Math.PI / 180) * sideSign;

  return (
    <group position={[x, y, z]}>
      <Billboard>
        <mesh rotation={[0, 0, rot]} scale={[scale, scale, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color="#2a2a5a"
            side={THREE.DoubleSide}
            transparent
            opacity={0.9}
          />
          {/* 瞳 */}
          <mesh position={[0, -0.05, 0.001]}>
            <circleGeometry args={[0.25, 32]} />
            <meshBasicMaterial color="#4488cc" />
          </mesh>
          <mesh position={[0, -0.05, 0.002]}>
            <circleGeometry args={[0.12, 32]} />
            <meshBasicMaterial color="#111111" />
          </mesh>
          {/* ハイライト */}
          <mesh position={[0.1, 0.05, 0.003]}>
            <circleGeometry args={[0.08, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </mesh>
      </Billboard>
    </group>
  );
}

function BrowSprite({
  side,
  browParams,
  angleDeg: _angleDeg,
}: {
  side: "left" | "right";
  browParams: BrowParams;
  angleDeg: number;
}) {
  const sideSign = side === "left" ? -1 : 1;

  const x = sideSign * browParams.spacing + browParams.horizontalOffset;
  const y = FACE_BASE_Y + browParams.verticalOffset;
  const z = FACE_FRONT_Z;
  const rot = browParams.rotation * (Math.PI / 180) * sideSign;

  return (
    <group position={[x, y, z]}>
      <Billboard>
        <mesh rotation={[0, 0, rot]} scale={[0.02, 0.003, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#3a2a1a" side={THREE.DoubleSide} />
        </mesh>
      </Billboard>
    </group>
  );
}

export function EyeBrowSprites({
  eyeParams,
  browParams,
  autoOffset,
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

  return (
    <group>
      <EyeSprite
        side="left"
        eyeParams={eyeParams}
        autoOffset={autoOffset}
        angleDeg={hRef.current}
      />
      <EyeSprite
        side="right"
        eyeParams={eyeParams}
        autoOffset={autoOffset}
        angleDeg={hRef.current}
      />
      <BrowSprite side="left" browParams={browParams} angleDeg={hRef.current} />
      <BrowSprite
        side="right"
        browParams={browParams}
        angleDeg={hRef.current}
      />
    </group>
  );
}
