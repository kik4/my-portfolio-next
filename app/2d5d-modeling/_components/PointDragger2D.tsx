/** biome-ignore-all lint/suspicious/noArrayIndexKey: point order is the identity */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: r3f three.js objects, not DOM */
"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Vec3 } from "../_lib/types";
import type { ViewKind } from "./Scene";

interface Props {
  view: ViewKind;
  points: Vec3[];
  selectedIndices: number[];
  pointSize?: number;
  onSelect: (index: number, mods: { shift: boolean }) => void;
  // Live updates while dragging (every move). Caller should treat as preview.
  onDrag: (index: number, next: Vec3) => void;
  // Final value on pointer up. Caller commits to history here.
  onCommit: (index: number, next: Vec3) => void;
}

// Per-2D-pane hit + drag layer. Renders a small invisible sphere on each
// point that captures pointer events. While dragging, ray-cast against the
// pane's drag plane to compute the new world position with the locked axis
// preserved.
export const PointDragger2D = ({
  view,
  points,
  selectedIndices,
  pointSize = 0.06,
  onSelect,
  onDrag,
  onCommit,
}: Props) => {
  const selectedSet = new Set(selectedIndices);
  const { camera, gl } = useThree();
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const draggingIdxRef = useRef<number | null>(null);
  draggingIdxRef.current = draggingIdx;
  // Snapshot of the locked-axis value at drag start, kept on the original
  // point so the locked axis doesn't drift even if the point moved earlier.
  const lockedAxisValueRef = useRef(0);

  useEffect(() => {
    if (draggingIdx === null) return;

    const onMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);

      // Plane perpendicular to the locked axis, through the locked-axis value.
      let plane: THREE.Plane;
      if (view === "front") {
        plane = new THREE.Plane(
          new THREE.Vector3(0, 0, 1),
          -lockedAxisValueRef.current,
        );
      } else if (view === "side") {
        plane = new THREE.Plane(
          new THREE.Vector3(1, 0, 0),
          -lockedAxisValueRef.current,
        );
      } else {
        plane = new THREE.Plane(
          new THREE.Vector3(0, 1, 0),
          -lockedAxisValueRef.current,
        );
      }

      const hit = new THREE.Vector3();
      const ok = ray.ray.intersectPlane(plane, hit);
      if (!ok) return;

      const idx = draggingIdxRef.current;
      if (idx === null) return;
      const cur = points[idx];
      let next: Vec3;
      if (view === "front") next = [hit.x, hit.y, cur[2]];
      else if (view === "side") next = [cur[0], hit.y, hit.z];
      else next = [hit.x, cur[1], hit.z];
      onDrag(idx, next);
    };

    const onUp = () => {
      const idx = draggingIdxRef.current;
      if (idx !== null) {
        const cur = points[idx];
        onCommit(idx, cur);
      }
      setDraggingIdx(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [draggingIdx, view, camera, gl, points, onDrag, onCommit]);

  return (
    <>
      {points.map((p, i) => (
        <mesh
          key={i}
          position={p}
          onPointerDown={(e) => {
            e.stopPropagation();
            const cur = points[i];
            lockedAxisValueRef.current =
              view === "front" ? cur[2] : view === "side" ? cur[0] : cur[1];
            setDraggingIdx(i);
            onSelect(i, { shift: e.shiftKey });
          }}
        >
          <sphereGeometry args={[pointSize, 12, 8]} />
          <meshBasicMaterial
            color={selectedSet.has(i) ? "#ff3300" : "#0066ff"}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </>
  );
};
