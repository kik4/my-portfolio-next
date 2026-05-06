import type { Group, Mesh, Model, Part } from "./types";

// Build a UV-sphere-style mesh with the given segment / ring counts. Edges
// connect lat / lon neighbours so the explicit edge layer doubles as a
// wireframe overlay.
const buildSphereMesh = (
  radius: number,
  rings: number, // number of horizontal rings between (but excluding) the poles
  segments: number, // longitudinal segments
): Mesh => {
  const points: Mesh["points"] = [];
  // Top pole
  points.push([0, radius, 0]);
  // Middle rings
  for (let r = 1; r <= rings; r++) {
    const phi = (Math.PI * r) / (rings + 1); // [0..pi]
    const y = radius * Math.cos(phi);
    const rr = radius * Math.sin(phi);
    for (let s = 0; s < segments; s++) {
      const theta = (2 * Math.PI * s) / segments;
      points.push([rr * Math.cos(theta), y, rr * Math.sin(theta)]);
    }
  }
  // Bottom pole
  points.push([0, -radius, 0]);

  const topIndex = 0;
  const bottomIndex = points.length - 1;
  const ringStart = (r: number) => 1 + r * segments; // r in [0..rings-1]

  const edges: Mesh["edges"] = [];
  const faces: Mesh["faces"] = [];

  // Top cap fan
  for (let s = 0; s < segments; s++) {
    const a = ringStart(0) + s;
    const b = ringStart(0) + ((s + 1) % segments);
    edges.push([topIndex, a]);
    faces.push([topIndex, b, a]);
  }
  // Middle quads (each = 2 triangles)
  for (let r = 0; r < rings - 1; r++) {
    for (let s = 0; s < segments; s++) {
      const a = ringStart(r) + s;
      const b = ringStart(r) + ((s + 1) % segments);
      const c = ringStart(r + 1) + ((s + 1) % segments);
      const d = ringStart(r + 1) + s;
      // CCW from outside (camera looking in toward the surface)
      faces.push([a, b, c]);
      faces.push([a, c, d]);
      edges.push([a, b]);
      edges.push([a, d]);
    }
  }
  // Bottom ring vertical edges + bottom-row horizontal
  const lastRing = rings - 1;
  for (let s = 0; s < segments; s++) {
    const a = ringStart(lastRing) + s;
    const b = ringStart(lastRing) + ((s + 1) % segments);
    edges.push([a, b]);
  }
  // Bottom cap fan
  for (let s = 0; s < segments; s++) {
    const a = ringStart(lastRing) + s;
    const b = ringStart(lastRing) + ((s + 1) % segments);
    edges.push([bottomIndex, a]);
    faces.push([bottomIndex, a, b]);
  }

  return { points, edges, faces };
};

// Factories for new tree nodes (used by the part tree's add buttons).

export const buildEmptyMesh = (): Mesh => ({
  points: [],
  edges: [],
  faces: [],
});

export const buildNewGroup = (
  id: string,
  name: string,
  parentId: string | null,
): Group => ({ id, name, parentId, visible: true });

export const buildNewPart = (
  id: string,
  name: string,
  groupId: string,
): Part => ({
  id,
  name,
  groupId,
  visible: true,
  mesh: buildEmptyMesh(),
  strokeColor: "#222222",
  fillColor: "#cccccc",
  strokeWidth: 2,
});

export const buildDefaultModel = (): Model => {
  const groupId = "group-root";
  const partId = "part-sphere";
  const group: Group = {
    id: groupId,
    name: "root",
    parentId: null,
    visible: true,
  };
  const part: Part = {
    id: partId,
    name: "sphere",
    groupId,
    visible: true,
    mesh: buildSphereMesh(0.6, 6, 12),
    strokeColor: "#222222",
    fillColor: "#cccccc",
    strokeWidth: 2,
  };
  return {
    version: 5,
    groups: [group],
    parts: [part],
  };
};
