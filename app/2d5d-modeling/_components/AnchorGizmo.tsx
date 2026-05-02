"use client";

import { TransformControls } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import type * as THREE from "three";
import { animRbfWeights, composeViewWithAnim } from "../_lib/animRbf";
import { applyGroupChainToPlacement } from "../_lib/groupTransform";
import { resolvePlacement } from "../_lib/placement";
import type { Part, PartGroup, Vec3 } from "../_lib/types";
import { interpolateViewKeyframes } from "../_lib/viewRbf";

interface Props {
  part: Part;
  groups: PartGroup[];
  headMesh: THREE.Mesh;
  yaw: number;
  pitch: number;
  animParams: Record<string, number>;
  // Index of the view keyframe whose anchor we're editing.
  editingKfIndex: number;
  // Called once on drag end with the new anchor direction (already normalized).
  onAnchorChange: (next: Vec3) => void;
}

// 3D handle for the selected part's anchor: a TransformControls gizmo parked
// at the part's resolved surface point. Drag in any axis to move it; on
// release the new world position is converted back to a unit direction from
// the head center and committed as the anchor of the currently edited view
// keyframe.
//
// Only renders on the main interactive scene (the parent should not pass
// this to fixed mini views).
export const AnchorGizmo = ({
  part,
  groups,
  headMesh,
  yaw,
  pitch,
  animParams,
  editingKfIndex,
  onAnchorChange,
}: Props) => {
  // We hold the underlying Object3D in state (rather than a ref) because
  // <TransformControls object={...} /> needs the actual node, not a ref. The
  // node ref callback below promotes it.
  const [target, setTarget] = useState<THREE.Group | null>(null);

  // Resolve the same placement the renderer uses, so the gizmo sits where the
  // part actually appears.
  const resolved = useMemo(() => {
    if (part.viewKeyframes.length === 0) return null;
    const idx = Math.min(editingKfIndex, part.viewKeyframes.length - 1);
    const view = interpolateViewKeyframes(
      // Use the edited keyframe alone so the gizmo follows that keyframe's
      // anchor directly, not a blended position. (If we used the full RBF the
      // gizmo would jitter as the user orbits the camera.)
      [part.viewKeyframes[idx]],
      yaw,
      pitch,
      part.rbfSigmaView,
    );
    const composed =
      part.animKeyframes.length > 0
        ? composeViewWithAnim(
            view,
            part.animKeyframes,
            animRbfWeights(part.animKeyframes, animParams, part.rbfSigmaAnim),
          )
        : view;
    const placementWithGroup = applyGroupChainToPlacement(
      groups,
      part.groupId,
      composed.placement,
      yaw,
      pitch,
      animParams,
    );
    headMesh.updateMatrixWorld();
    return resolvePlacement(placementWithGroup, headMesh);
  }, [part, editingKfIndex, groups, headMesh, yaw, pitch, animParams]);

  // Park the helper group at the resolved surface position whenever it changes.
  useEffect(() => {
    if (!target || !resolved) return;
    target.position.copy(resolved.position);
  }, [target, resolved]);

  if (!resolved) return null;

  return (
    <>
      {/* Invisible group that the gizmo manipulates. */}
      <group ref={setTarget} />
      {target && (
        <TransformControls
          object={target}
          mode="translate"
          size={0.5}
          onMouseUp={() => {
            const v = target.position;
            const len = Math.hypot(v.x, v.y, v.z);
            if (len === 0) return;
            // The gizmo was dragged to an arbitrary world point. Re-normalize
            // back to a unit direction from the head center; resolvePlacement
            // will project that onto the head surface again, so the part snaps
            // back to the surface even if the user dragged the gizmo into space.
            onAnchorChange([v.x / len, v.y / len, v.z / len]);
          }}
        />
      )}
    </>
  );
};
