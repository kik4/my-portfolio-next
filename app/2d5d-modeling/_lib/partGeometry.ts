import earcut from "earcut";
import * as THREE from "three";
import type { PartShape, Vec2 } from "./types";

// Build a flat XY-plane geometry from already-transformed 2D points.
// Triangulates the closed polygon with earcut. The resulting geometry has
// z=0 for every vertex; the caller is responsible for placing it in 3D.
export const buildFillGeometryFromPoints = (
  points: Vec2[],
): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();
  if (points.length < 3) {
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([], 3));
    geometry.setIndex([]);
    return geometry;
  }

  const flat: number[] = [];
  for (const [x, y] of points) flat.push(x, y);
  const indices = earcut(flat);

  const positions: number[] = [];
  for (let i = 0; i < points.length; i++) {
    positions.push(flat[i * 2], flat[i * 2 + 1], 0);
  }
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

// Line-loop / line-segment positions for the part outline. closed=true loops
// the last point back to the first.
export const buildStrokePositionsFromPoints = (
  points: Vec2[],
  closed: boolean,
): Float32Array => {
  const flat: number[] = [];
  for (const [x, y] of points) flat.push(x, y, 0);
  if (closed && points.length > 0) {
    flat.push(points[0][0], points[0][1], 0);
  }
  return new Float32Array(flat);
};

// Convenience: apply identity-only path (no transform) for tests / the editor.
export const passThroughShape = (shape: PartShape): Vec2[] =>
  shape.basePoints.map((p) => [p[0], p[1]] as Vec2);
