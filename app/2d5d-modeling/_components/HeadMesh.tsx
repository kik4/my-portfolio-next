"use client";

import { forwardRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { buildHeadGeometry } from "../_lib/headMeshBuild";
import { createOutlineMaterial } from "../_lib/outlineMaterial";
import type { HeadMesh as HeadMeshData } from "../_lib/types";

interface Props {
  head: HeadMeshData;
}

// Renders the head mesh + (optionally) the silhouette outline as a backface
// hull. The mesh ref is forwarded so the parent can use it as a raycaster
// target for placing parts.
export const HeadMesh = forwardRef<THREE.Mesh, Props>(({ head }, ref) => {
  const geometry = useMemo(() => buildHeadGeometry(head), [head]);
  const fillMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: head.fillColor,
        side: THREE.FrontSide,
        roughness: 0.8,
        metalness: 0,
      }),
    [head.fillColor],
  );
  const outlineMaterial = useMemo(
    () => createOutlineMaterial(head.outline.color, head.outline.thickness),
    [head.outline.color, head.outline.thickness],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      fillMaterial.dispose();
      outlineMaterial.dispose();
    };
  }, [geometry, fillMaterial, outlineMaterial]);

  return (
    <group>
      <mesh ref={ref} geometry={geometry} material={fillMaterial} />
      {head.outline.enabled && (
        <mesh geometry={geometry} material={outlineMaterial} />
      )}
    </group>
  );
});

HeadMesh.displayName = "HeadMesh";
