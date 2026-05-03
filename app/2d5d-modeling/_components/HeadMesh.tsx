"use client";

import { forwardRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { buildHeadGeometry } from "../_lib/headMeshBuild";
import { createOutlineMaterial } from "../_lib/outlineMaterial";
import type { HeadMesh as HeadMeshData } from "../_lib/types";

export type ShadingMode = "smooth" | "flat" | "toon";

interface Props {
  head: HeadMeshData;
  shadingMode?: ShadingMode;
}

// Build a 3-step nearest-filtered gradient texture for MeshToonMaterial.
// Each pixel value drives the brightness band: dark / mid / lit.
const buildToonGradient = (): THREE.DataTexture => {
  const data = new Uint8Array([80, 170, 255]);
  const tex = new THREE.DataTexture(
    data,
    data.length,
    1,
    THREE.RedFormat,
    THREE.UnsignedByteType,
  );
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
};

const buildFillMaterial = (
  color: string,
  shadingMode: ShadingMode,
  gradient: THREE.DataTexture,
): THREE.Material => {
  if (shadingMode === "toon") {
    return new THREE.MeshToonMaterial({
      color,
      side: THREE.FrontSide,
      gradientMap: gradient,
    });
  }
  return new THREE.MeshStandardMaterial({
    color,
    side: THREE.FrontSide,
    roughness: 0.8,
    metalness: 0,
    flatShading: shadingMode === "flat",
  });
};

// Renders the head mesh + (optionally) the silhouette outline as a backface
// hull. The mesh ref is forwarded so the parent can use it as a raycaster
// target for placing parts.
export const HeadMesh = forwardRef<THREE.Mesh, Props>(
  ({ head, shadingMode = "smooth" }, ref) => {
    const geometry = useMemo(() => buildHeadGeometry(head), [head]);
    // The toon gradient is small and reusable across re-renders; keep it
    // alive for the component's lifetime instead of rebuilding per material.
    const toonGradient = useMemo(() => buildToonGradient(), []);
    const fillMaterial = useMemo(
      () => buildFillMaterial(head.fillColor, shadingMode, toonGradient),
      [head.fillColor, shadingMode, toonGradient],
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

    useEffect(() => () => toonGradient.dispose(), [toonGradient]);

    return (
      <group>
        <mesh ref={ref} geometry={geometry} material={fillMaterial} />
        {head.outline.enabled && (
          <mesh geometry={geometry} material={outlineMaterial} />
        )}
      </group>
    );
  },
);

HeadMesh.displayName = "HeadMesh";
