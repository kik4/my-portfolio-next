"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { animRbfWeights, composeViewWithAnim } from "../_lib/animRbf";
import {
  applyGroupChainToPlacement,
  isGroupChainVisible,
} from "../_lib/groupTransform";
import {
  buildPartFillGeometry,
  buildPartStrokePositions,
} from "../_lib/partGeometry";
import { resolvePlacement } from "../_lib/placement";
import type { Part, PartGroup } from "../_lib/types";
import { interpolateViewKeyframes } from "../_lib/viewRbf";

interface Props {
  parts: Part[];
  groups: PartGroup[];
  // The head mesh used as the raycast target to resolve part placements.
  headMesh: THREE.Mesh | null;
  // Current camera angles in degrees, supplied by the parent (Scene).
  yaw: number;
  pitch: number;
  // Current named animation parameter values.
  animParams: Record<string, number>;
}

// Renders all parts at their resolved positions/orientations using the view
// RBF interpolation of their viewKeyframes for the current (yaw, pitch),
// then layered with anim deltas for the current animParams, and finally with
// the accumulated transform deltas of the part's group chain.
export const Parts = ({
  parts,
  groups,
  headMesh,
  yaw,
  pitch,
  animParams,
}: Props) => {
  if (!headMesh) return null;

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
            headMesh={headMesh}
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
  groups: PartGroup[];
  headMesh: THREE.Mesh;
  yaw: number;
  pitch: number;
  animParams: Record<string, number>;
}

const PartRenderer = ({
  part,
  groups,
  headMesh,
  yaw,
  pitch,
  animParams,
}: PartRendererProps) => {
  const groupRef = useRef<THREE.Group>(null);

  // Compose a single effective view keyframe at the current camera angles,
  // then layer anim keyframe deltas.
  const kf = useMemo(() => {
    const base = interpolateViewKeyframes(
      part.viewKeyframes,
      yaw,
      pitch,
      part.rbfSigmaView,
    );
    if (part.animKeyframes.length === 0) return base;
    const weights = animRbfWeights(
      part.animKeyframes,
      animParams,
      part.rbfSigmaAnim,
    );
    return composeViewWithAnim(base, part.animKeyframes, weights);
  }, [
    part.viewKeyframes,
    part.animKeyframes,
    part.rbfSigmaView,
    part.rbfSigmaAnim,
    yaw,
    pitch,
    animParams,
  ]);

  // Bake group transform deltas into the placement before any geometry
  // building or raycast resolution. Group transform is part of the part's
  // effective placement, not a separate stage.
  const placementWithGroup = useMemo(
    () =>
      applyGroupChainToPlacement(
        groups,
        part.groupId,
        kf.placement,
        yaw,
        pitch,
        animParams,
      ),
    [groups, part.groupId, kf.placement, yaw, pitch, animParams],
  );

  const fillGeometry = useMemo(
    () => buildPartFillGeometry(kf.shape, placementWithGroup.scale),
    [kf.shape, placementWithGroup.scale],
  );
  const fillMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: part.fillColor,
        transparent: true,
        opacity: kf.alpha,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [part.fillColor, kf.alpha],
  );

  const strokePositions = useMemo(
    () =>
      part.strokeWidth > 0
        ? buildPartStrokePositions(kf.shape, placementWithGroup.scale)
        : null,
    [part.strokeWidth, kf.shape, placementWithGroup.scale],
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
            opacity: kf.alpha,
          })
        : null,
    [part.strokeWidth, part.strokeColor, kf.alpha],
  );

  useEffect(() => {
    return () => {
      fillGeometry.dispose();
      fillMaterial.dispose();
      strokeGeometry?.dispose();
      strokeMaterial?.dispose();
    };
  }, [fillGeometry, fillMaterial, strokeGeometry, strokeMaterial]);

  // Resolve placement against the head mesh on every render. Cheap because
  // it's a single raycast per part.
  const placement = useMemo(() => {
    headMesh.updateMatrixWorld();
    return resolvePlacement(placementWithGroup, headMesh);
  }, [placementWithGroup, headMesh]);

  if (!kf.visible) return null;

  return (
    <group
      ref={groupRef}
      position={placement.position}
      quaternion={placement.quaternion}
    >
      <mesh geometry={fillGeometry} material={fillMaterial} />
      {strokeGeometry && strokeMaterial && (
        <lineLoop geometry={strokeGeometry} material={strokeMaterial} />
      )}
    </group>
  );
};
