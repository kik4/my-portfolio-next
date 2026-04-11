import * as THREE from "three";
import { subdivideClosed } from "./catmullRom";
import { triangulate } from "./triangulate";
import type { FaceModel } from "./types";

const SUBDIVISION_SEGMENTS = 8;
const LAYER_Z_STEP = 0.001;

export function buildFaceGeometry(model: FaceModel): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  const sorted = [...model.polygons].sort(
    (a, b) => a.layerIndex - b.layerIndex,
  );

  for (const polygon of sorted) {
    const subdivided = subdivideClosed(
      polygon.basePoints,
      SUBDIVISION_SEGMENTS,
    );
    const tris = triangulate(subdivided);

    const z = polygon.layerIndex * LAYER_Z_STEP;
    const [r, g, b, a] = polygon.fillColor;

    for (const [x, y] of subdivided) {
      positions.push(x, y, z);
      colors.push(r, g, b, a);
    }
    for (const idx of tris) {
      indices.push(idx + vertexOffset);
    }
    vertexOffset += subdivided.length;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
