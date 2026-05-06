"use client";

import { TransformControls } from "@react-three/drei";
import { useCallback, useEffect, useState } from "react";
import type * as THREE from "three";
import type { Vec3 } from "../_lib/types";

interface Props {
  position: Vec3;
  onCommit: (next: Vec3) => void;
}

export const PointGizmo = ({ position, onCommit }: Props) => {
  const [target, setTarget] = useState<THREE.Object3D | null>(null);

  const setTargetRef = useCallback((o: THREE.Object3D | null) => {
    setTarget((prev) => (prev === o ? prev : o));
  }, []);

  useEffect(() => {
    if (target) {
      target.position.set(position[0], position[1], position[2]);
    }
  }, [target, position]);

  return (
    <>
      <object3D ref={setTargetRef} />
      {target && (
        <TransformControls
          object={target}
          mode="translate"
          onMouseUp={() => {
            const p = target.position;
            onCommit([p.x, p.y, p.z]);
          }}
        />
      )}
    </>
  );
};
