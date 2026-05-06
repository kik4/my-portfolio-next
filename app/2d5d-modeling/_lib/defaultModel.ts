import type { Group, Mesh, Model, Part, Vec3 } from "./types";

// Regular icosahedron: 12 vertices, 30 edges, 20 triangle faces. Every face
// is genuinely flat, so silhouette extraction never gets confused by
// non-planar quad pairs (which the UV-sphere suffered from). Good enough as
// a rough sphere stand-in for the editor's default scene; users can refine
// further by adding points and faces.
const buildIcosahedronMesh = (radius: number): Mesh => {
  // Golden ratio. The icosahedron's 12 vertices are formed by three mutually
  // perpendicular golden rectangles (±1, ±phi) on each axis triple.
  const phi = (1 + Math.sqrt(5)) / 2;
  const norm = Math.sqrt(1 + phi * phi);
  const a = radius / norm;
  const b = (radius * phi) / norm;

  const points: Vec3[] = [
    [-a, b, 0],
    [a, b, 0],
    [-a, -b, 0],
    [a, -b, 0],
    [0, -a, b],
    [0, a, b],
    [0, -a, -b],
    [0, a, -b],
    [b, 0, -a],
    [b, 0, a],
    [-b, 0, -a],
    [-b, 0, a],
  ];

  // Faces are CCW from outside. List sourced from the canonical icosahedron
  // tessellation so winding is consistent.
  const faces: [number, number, number][] = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];

  // Derive the unique edge set from the face list. An icosahedron has
  // exactly 30 edges; building from faces avoids transcription mistakes.
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  const key = (u: number, v: number) => (u < v ? `${u}-${v}` : `${v}-${u}`);
  for (const [u, v, w] of faces) {
    for (const [p, q] of [
      [u, v],
      [v, w],
      [w, u],
    ] as const) {
      const k = key(p, q);
      if (!seen.has(k)) {
        seen.add(k);
        edges.push([p, q]);
      }
    }
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
  const partId = "part-ico";
  const group: Group = {
    id: groupId,
    name: "root",
    parentId: null,
    visible: true,
  };
  const part: Part = {
    id: partId,
    name: "icosahedron",
    groupId,
    visible: true,
    mesh: buildIcosahedronMesh(0.6),
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
