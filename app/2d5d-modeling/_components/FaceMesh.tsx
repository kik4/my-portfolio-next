"use client";

import { Billboard } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { buildFaceGeometry } from "../_lib/buildGeometry";
import type { FaceModel, YawPitch } from "../_lib/types";

interface FaceMeshProps {
  model: FaceModel;
  angle: YawPitch;
  opacity: number;
}

export function FaceMesh({ model, angle, opacity }: FaceMeshProps) {
  const geometry = useMemo(
    () => buildFaceGeometry(model, angle),
    [model, angle],
  );

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => {
    material.opacity = opacity;
    material.transparent = opacity < 1;
    material.depthWrite = opacity >= 1;
    material.needsUpdate = true;
  }, [material, opacity]);

  return (
    <Billboard>
      <mesh geometry={geometry} material={material} />
    </Billboard>
  );
}
