import type { Mesh, Vec3 } from "./types";

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3): number =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const faceNormal = (mesh: Mesh, faceIndex: number): Vec3 => {
  const [a, b, c] = mesh.faces[faceIndex];
  const ab = sub(mesh.points[b], mesh.points[a]);
  const ac = sub(mesh.points[c], mesh.points[a]);
  return cross(ab, ac);
};

const edgeKey = (a: number, b: number): string =>
  a < b ? `${a}-${b}` : `${b}-${a}`;

// For each undirected edge in any face, list the faces that contain it.
const buildFaceAdjacency = (mesh: Mesh): Map<string, number[]> => {
  const map = new Map<string, number[]>();
  for (let fi = 0; fi < mesh.faces.length; fi++) {
    const [a, b, c] = mesh.faces[fi];
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const k = edgeKey(u, v);
      const list = map.get(k);
      if (list) list.push(fi);
      else map.set(k, [fi]);
    }
  }
  return map;
};

export interface SilhouetteResult {
  // Pairs of point indices that should be drawn as silhouette lines. Each
  // pair is undirected. May overlap with mesh.edges (caller decides whether
  // to dedupe against the explicit edge set).
  silhouetteEdges: [number, number][];
}

// One closed (or open) chain of point indices walking the silhouette. For
// well-behaved closed silhouettes the first and last index are the same.
// Open chains can occur when the mesh has boundary holes or when the
// silhouette edge graph is not simply degree-2 everywhere.
export type SilhouetteLoop = number[];

const faceCentroid = (mesh: Mesh, faceIndex: number): Vec3 => {
  const [a, b, c] = mesh.faces[faceIndex];
  const pa = mesh.points[a];
  const pb = mesh.points[b];
  const pc = mesh.points[c];
  return [
    (pa[0] + pb[0] + pc[0]) / 3,
    (pa[1] + pb[1] + pc[1]) / 3,
    (pa[2] + pb[2] + pc[2]) / 3,
  ];
};

// Extract silhouette edges as seen from a camera at `cameraPos` (world space).
// Each face's facing is computed against the per-face vector from its centroid
// to the camera, so this works for perspective projection. For orthographic
// the same code remains correct because all those vectors are roughly
// parallel when the camera is far away. An edge is a silhouette if:
//   - it is a boundary edge (used by exactly one face), OR
//   - it borders two faces whose facing relative to the view differs.
export const extractSilhouette = (
  mesh: Mesh,
  cameraPos: Vec3,
): SilhouetteResult => {
  const adj = buildFaceAdjacency(mesh);
  const silhouetteEdges: [number, number][] = [];

  // Cache facing per face: positive = front (centroid->camera aligns with
  // outward normal), negative = back.
  const facing = mesh.faces.map((_, i) => {
    const n = faceNormal(mesh, i);
    const c = faceCentroid(mesh, i);
    const toCam: Vec3 = [
      cameraPos[0] - c[0],
      cameraPos[1] - c[1],
      cameraPos[2] - c[2],
    ];
    return dot(n, toCam);
  });

  for (const [k, faces] of adj) {
    const [aStr, bStr] = k.split("-");
    const a = Number(aStr);
    const b = Number(bStr);
    if (faces.length === 1) {
      silhouetteEdges.push([a, b]);
      continue;
    }
    if (faces.length >= 2) {
      // Any pair of adjacent faces with sign-flipped facing produces a
      // silhouette segment. With proper triangle meshes each edge has at
      // most two faces; for >2 (non-manifold) we still flag the edge if any
      // pair disagrees.
      let hasFront = false;
      let hasBack = false;
      for (const fi of faces) {
        if (facing[fi] > 0) hasFront = true;
        else if (facing[fi] < 0) hasBack = true;
      }
      if (hasFront && hasBack) silhouetteEdges.push([a, b]);
    }
  }

  return { silhouetteEdges };
};

// Walk silhouette edges into one or more closed/open loops of point indices.
//
// Algorithm: build an adjacency map (point -> list of neighbour points via
// silhouette edges). Pop an unused edge and follow neighbours, choosing any
// available continuation, until we return to the start (closed) or run out
// (open). Repeat for the remaining unused edges.
//
// Each emitted closed loop has its first index repeated at the end so callers
// can iterate edges by [i, i+1] without modular arithmetic. Open loops do not
// repeat.
export const chainSilhouetteLoops = (
  edges: [number, number][],
): SilhouetteLoop[] => {
  // Adjacency: for each point, an array of (neighbour, edgeIndex) pairs.
  const adj = new Map<number, { other: number; edgeIdx: number }[]>();
  const ensure = (k: number) => {
    let list = adj.get(k);
    if (!list) {
      list = [];
      adj.set(k, list);
    }
    return list;
  };
  for (let i = 0; i < edges.length; i++) {
    const [a, b] = edges[i];
    ensure(a).push({ other: b, edgeIdx: i });
    ensure(b).push({ other: a, edgeIdx: i });
  }

  const used = new Array<boolean>(edges.length).fill(false);
  const loops: SilhouetteLoop[] = [];

  // Helper: take an unused continuation from `from`, mark the edge used,
  // return the neighbour point or null if dead-end.
  const stepFrom = (from: number): number | null => {
    const list = adj.get(from);
    if (!list) return null;
    for (const { other, edgeIdx } of list) {
      if (!used[edgeIdx]) {
        used[edgeIdx] = true;
        return other;
      }
    }
    return null;
  };

  for (let i = 0; i < edges.length; i++) {
    if (used[i]) continue;
    const start = edges[i][0];
    used[i] = true;
    const loop: number[] = [start, edges[i][1]];
    let cur = edges[i][1];
    while (cur !== start) {
      const next = stepFrom(cur);
      if (next === null) break; // open loop
      loop.push(next);
      cur = next;
    }
    loops.push(loop);
  }

  return loops;
};
