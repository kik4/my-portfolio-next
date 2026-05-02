import earcut from "earcut";
import * as THREE from "three";
import type { PartShape, Vec2 } from "./types";

// Build a flat XY-plane geometry for a part. Triangulates the closed polygon
// with earcut. For open polylines we currently still triangulate the convex
// hull-ish loop so users see something reasonable.
export const buildPartFillGeometry = (
  shape: PartShape,
  scale: Vec2,
): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();
  const points = shape.basePoints;
  if (points.length < 3) {
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([], 3));
    geometry.setIndex([]);
    return geometry;
  }

  const flat: number[] = [];
  for (const [x, y] of points) {
    flat.push(x * scale[0], y * scale[1]);
  }
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

// Build a line geometry for the part outline (when strokeWidth > 0). Uses a
// flat positions array with a LineLoop or LineSegments topology depending on
// shape.closed.
export const buildPartStrokePositions = (
  shape: PartShape,
  scale: Vec2,
): Float32Array => {
  const points = shape.basePoints;
  const flat: number[] = [];
  for (const [x, y] of points) {
    flat.push(x * scale[0], y * scale[1], 0);
  }
  if (shape.closed && points.length > 0) {
    flat.push(points[0][0] * scale[0], points[0][1] * scale[1], 0);
  }
  return new Float32Array(flat);
};
