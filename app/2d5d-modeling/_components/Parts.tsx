"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  buildPartFillGeometry,
  buildPartStrokePositions,
} from "../_lib/partGeometry";
import { resolvePlacement } from "../_lib/placement";
import type { Part } from "../_lib/types";
import { interpolateViewKeyframes } from "../_lib/viewRbf";

interface Props {
  parts: Part[];
  // The head mesh used as the raycast target to resolve part placements.
  headMesh: THREE.Mesh | null;
  // Current camera angles in degrees, supplied by the parent (Scene).
  yaw: number;
  pitch: number;
}

// Renders all parts at their resolved positions/orientations using the view
// RBF interpolation of their viewKeyframes for the current (yaw, pitch).
export const Parts = ({ parts, headMesh, yaw, pitch }: Props) => {
  if (!headMesh) return null;

  const sorted = [...parts].sort((a, b) => a.layerIndex - b.layerIndex);
  return (
    <>
      {sorted.map((part) => (
        <PartRenderer
          key={part.id}
          part={part}
          headMesh={headMesh}
          yaw={yaw}
          pitch={pitch}
        />
      ))}
    </>
  );
};

interface PartRendererProps {
  part: Part;
  headMesh: THREE.Mesh;
  yaw: number;
  pitch: number;
}

const PartRenderer = ({ part, headMesh, yaw, pitch }: PartRendererProps) => {
  const groupRef = useRef<THREE.Group>(null);

  // Compose a single effective view keyframe at the current camera angles.
  const kf = useMemo(
    () =>
      interpolateViewKeyframes(
        part.viewKeyframes,
        yaw,
        pitch,
        part.rbfSigmaView,
      ),
    [part.viewKeyframes, yaw, pitch, part.rbfSigmaView],
  );

  const fillGeometry = useMemo(
    () => buildPartFillGeometry(kf.shape, kf.placement.scale),
    [kf.shape, kf.placement.scale],
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
        ? buildPartStrokePositions(kf.shape, kf.placement.scale)
        : null,
    [part.strokeWidth, kf.shape, kf.placement.scale],
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
    return resolvePlacement(kf.placement, headMesh);
  }, [kf.placement, headMesh]);

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
