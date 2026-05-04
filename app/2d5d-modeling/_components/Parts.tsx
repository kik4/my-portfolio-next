"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { applyAffine, composeAffine } from "../_lib/affine";
import { composePartViewWithAnim } from "../_lib/animRbf";
import { isGroupChainVisible, resolveGroupChain } from "../_lib/groupTransform";
import {
  buildFillGeometryFromPoints,
  buildStrokePositionsFromPoints,
} from "../_lib/partGeometry";
import type { Group, Part, Vec2 } from "../_lib/types";
import { interpolatePartViewKeyframes } from "../_lib/viewRbf";

interface Props {
  parts: Part[];
  groups: Group[];
  yaw: number;
  pitch: number;
  animParams: Record<string, number>;
}

// Renders all parts as billboards anchored at their root group's 3D anchor.
// Each part's shape points go through:
//   - part view RBF interpolation (yaw/pitch) → InterpolatedPartView
//   - part anim composition → adds shapeDelta + affineDelta
//   - chain affine (root + child groups) composed onto the part's affine
//   - the chain's group anchor positions the billboard plane
//   - the camera quaternion orients the plane
export const Parts = ({ parts, groups, yaw, pitch, animParams }: Props) => {
  const sorted = [...parts].sort((a, b) => a.layerIndex - b.layerIndex);
  return (
    <>
      {sorted.map((part) => {
        if (!isGroupChainVisible(groups, part.groupId)) return null;
        return (
          <PartRenderer
            key={part.id}
            part={part}
            groups={groups}
            yaw={yaw}
            pitch={pitch}
            animParams={animParams}
          />
        );
      })}
    </>
  );
};

interface PartRendererProps {
  part: Part;
  groups: Group[];
  yaw: number;
  pitch: number;
  animParams: Record<string, number>;
}

const PartRenderer = ({
  part,
  groups,
  yaw,
  pitch,
  animParams,
}: PartRendererProps) => {
  const groupRef = useRef<THREE.Group>(null);
  // Each frame, copy the camera's quaternion onto our group so the billboard
  // plane stays facing the camera. Using useFrame here rather than passing
  // a quaternion through props keeps the orbit-controls update loop in sync.
  useFrame(({ camera }) => {
    if (groupRef.current) {
      groupRef.current.quaternion.copy(camera.quaternion);
    }
  });
  const baseView = useMemo(
    () => interpolatePartViewKeyframes(part.viewKeyframes, yaw, pitch),
    [part.viewKeyframes, yaw, pitch],
  );

  const partView = useMemo(
    () =>
      composePartViewWithAnim(
        baseView,
        part.animKeyframes,
        animParams,
        part.rbfSigmaAnim,
      ),
    [baseView, part.animKeyframes, animParams, part.rbfSigmaAnim],
  );

  const chain = useMemo(
    () => resolveGroupChain(groups, part.groupId, yaw, pitch, animParams),
    [groups, part.groupId, yaw, pitch, animParams],
  );

  // Final 2D points = chain.affine ∘ part.affine applied to shape.basePoints.
  const transformedPoints = useMemo(() => {
    const m = composeAffine(chain.affine, partView.affine);
    return partView.shape.basePoints.map((p) => applyAffine(m, p) as Vec2);
  }, [chain.affine, partView.affine, partView.shape.basePoints]);

  const fillGeometry = useMemo(
    () => buildFillGeometryFromPoints(transformedPoints),
    [transformedPoints],
  );
  const fillMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: part.fillColor,
        transparent: true,
        opacity: clamp01(partView.alpha * chain.alpha),
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [part.fillColor, partView.alpha, chain.alpha],
  );

  const strokePositions = useMemo(
    () =>
      part.strokeWidth > 0
        ? buildStrokePositionsFromPoints(
            transformedPoints,
            partView.shape.closed,
          )
        : null,
    [part.strokeWidth, transformedPoints, partView.shape.closed],
  );

  const strokeGeometry = useMemo(() => {
    if (!strokePositions) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(strokePositions, 3));
    return g;
  }, [strokePositions]);

  const strokeMaterial = useMemo(
    () =>
      part.strokeWidth > 0
        ? new THREE.LineBasicMaterial({
            color: part.strokeColor,
            transparent: true,
            opacity: clamp01(partView.alpha * chain.alpha),
          })
        : null,
    [part.strokeWidth, part.strokeColor, partView.alpha, chain.alpha],
  );

  useEffect(() => {
    return () => {
      fillGeometry.dispose();
      fillMaterial.dispose();
      strokeGeometry?.dispose();
      strokeMaterial?.dispose();
    };
  }, [fillGeometry, fillMaterial, strokeGeometry, strokeMaterial]);

  if (!partView.visible || !chain.visible) return null;

  return (
    <group ref={groupRef} position={chain.anchor}>
      <mesh geometry={fillGeometry} material={fillMaterial} />
      {strokeGeometry && strokeMaterial && (
        <lineLoop geometry={strokeGeometry} material={strokeMaterial} />
      )}
    </group>
  );
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
