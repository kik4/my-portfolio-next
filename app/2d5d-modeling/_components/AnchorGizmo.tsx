"use client";

import { TransformControls } from "@react-three/drei";
import { useCallback, useEffect, useState } from "react";
import type * as THREE from "three";
import type { RootGroup, Vec3 } from "../_lib/types";

interface Props {
  group: RootGroup;
  // Index of the view keyframe whose anchor we are editing.
  editingKfIndex: number;
  // Called on drag end, with the new anchor [x, y, z]. Commit only on
  // release so the history isn't spammed every frame.
  onAnchorChange: (next: Vec3) => void;
}

// Free 3D translate gizmo for a root group's anchor. The anchor lives in
// world space, no surface snapping. A dummy Object3D drives the gizmo so we
// can update it imperatively mid-drag without re-rendering.
export const AnchorGizmo = ({
  group,
  editingKfIndex,
  onAnchorChange,
}: Props) => {
  const safeIdx = Math.min(editingKfIndex, group.viewKeyframes.length - 1);
  const kf = group.viewKeyframes[safeIdx];
  const [target, setTarget] = useState<THREE.Object3D | null>(null);

  // Stable ref callback so r3f doesn't reattach every render.
  const setTargetRef = useCallback((o: THREE.Object3D | null) => {
    setTarget((prev) => (prev === o ? prev : o));
  }, []);

  // Park the dummy at the keyframe's anchor whenever the anchor changes via
  // props (e.g. numeric inputs in the editor or undo/redo).
  useEffect(() => {
    if (target) {
      target.position.set(kf.anchor[0], kf.anchor[1], kf.anchor[2]);
    }
  }, [target, kf.anchor]);

  return (
    <>
      <object3D ref={setTargetRef} />
      {target && (
        <TransformControls
          object={target}
          mode="translate"
          onMouseUp={() => {
            const p = target.position;
            onAnchorChange([p.x, p.y, p.z]);
          }}
        />
      )}
    </>
  );
};
