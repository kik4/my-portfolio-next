"use client";

import { Billboard } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { buildFaceGeometry } from "../_lib/buildGeometry";
import type { FaceModel } from "../_lib/types";

interface FaceMeshProps {
  model: FaceModel;
  opacity: number;
}

export function FaceMesh({ model, opacity }: FaceMeshProps) {
  const geometry = useMemo(() => buildFaceGeometry(model), [model]);

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
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
