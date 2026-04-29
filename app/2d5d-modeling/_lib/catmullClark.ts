import * as THREE from "three";
import type { ControlMesh, Vec3 } from "./types";

// Internal mutable working mesh for one subdivision iteration.
// Vertices/faces are arrays indexed by integer; we drop string ids during
// subdivision because they'd no longer be meaningful.
interface WorkingMesh {
  positions: Vec3[];
  // Each face is a list of vertex indices (CCW).
  faces: number[][];
}

function v3clone(p: Vec3): Vec3 {
  return [p[0], p[1], p[2]];
}

function v3divInPlace(a: Vec3, s: number): void {
  a[0] /= s;
  a[1] /= s;
  a[2] /= s;
}

// Edge key for an undirected edge between two vertex indices.
function edgeKey(a: number, b: number): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// Produce a deduplicated, "clean" face: collapse adjacent duplicates so that
// degenerate quads at the poles act as triangles for subdivision purposes.
function dedupeFace(face: number[]): number[] {
  if (face.length === 0) return face;
  const out: number[] = [];
  for (const idx of face) {
    if (out.length === 0 || out[out.length - 1] !== idx) {
      out.push(idx);
    }
  }
  // Collapse a duplicate that wraps from end to start.
  while (out.length > 1 && out[0] === out[out.length - 1]) {
    out.pop();
  }
  return out;
}

function fromControlMesh(mesh: ControlMesh): WorkingMesh {
  const idIndex = new Map<string, number>();
  const positions: Vec3[] = [];
  for (const v of mesh.vertices) {
    idIndex.set(v.id, positions.length);
    positions.push(v3clone(v.position));
  }
  const faces: number[][] = [];
  for (const f of mesh.faces) {
    const indices: number[] = [];
    for (const vid of f.vertexIds) {
      const idx = idIndex.get(vid);
      if (idx === undefined) {
        throw new Error(`unknown vertex id in face ${f.id}: ${vid}`);
      }
      indices.push(idx);
    }
    const cleaned = dedupeFace(indices);
    if (cleaned.length >= 3) faces.push(cleaned);
  }
  return { positions, faces };
}

// Standard Catmull-Clark single iteration.
//   1. face point: centroid of face vertices
//   2. edge point: average of edge endpoints + adjacent face points
//      (boundary edges fall back to the edge midpoint)
//   3. moved original vertex:
//        F = mean of adjacent face points
//        R = mean of adjacent edge midpoints
//        n = number of adjacent faces
//        P' = (F + 2R + (n-3)P) / n
//   4. each n-gon splits into n quads using face point as the center.
function subdivideOnce(mesh: WorkingMesh): WorkingMesh {
  const { positions, faces } = mesh;
  const vCount = positions.length;
  const fCount = faces.length;

  // 1. Face points.
  const facePoints: Vec3[] = new Array(fCount);
  for (let f = 0; f < fCount; f++) {
    const verts = faces[f];
    const sum: Vec3 = [0, 0, 0];
    for (const vi of verts) {
      sum[0] += positions[vi][0];
      sum[1] += positions[vi][1];
      sum[2] += positions[vi][2];
    }
    sum[0] /= verts.length;
    sum[1] /= verts.length;
    sum[2] /= verts.length;
    facePoints[f] = sum;
  }

  // 2. Build edge data.
  interface EdgeInfo {
    a: number;
    b: number;
    faceIndices: number[];
  }
  const edgeMap = new Map<string, EdgeInfo>();
  // For each face, the directed edges in order (used later for face splitting).
  const faceEdgeKeys: string[][] = new Array(fCount);

  for (let f = 0; f < fCount; f++) {
    const verts = faces[f];
    const keysForFace: string[] = new Array(verts.length);
    for (let i = 0; i < verts.length; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % verts.length];
      const k = edgeKey(a, b);
      keysForFace[i] = k;
      let info = edgeMap.get(k);
      if (info === undefined) {
        info = { a: Math.min(a, b), b: Math.max(a, b), faceIndices: [] };
        edgeMap.set(k, info);
      }
      info.faceIndices.push(f);
    }
    faceEdgeKeys[f] = keysForFace;
  }

  // Per-original-vertex aggregates for the moved-original term.
  const adjacentFacePointSum: Vec3[] = Array.from({ length: vCount }, () => [
    0, 0, 0,
  ]);
  const adjacentFacePointCount: number[] = new Array(vCount).fill(0);
  const adjacentEdgeMidpointSum: Vec3[] = Array.from({ length: vCount }, () => [
    0, 0, 0,
  ]);
  const adjacentEdgeMidpointCount: number[] = new Array(vCount).fill(0);

  for (let f = 0; f < fCount; f++) {
    const fp = facePoints[f];
    for (const vi of faces[f]) {
      adjacentFacePointSum[vi][0] += fp[0];
      adjacentFacePointSum[vi][1] += fp[1];
      adjacentFacePointSum[vi][2] += fp[2];
      adjacentFacePointCount[vi] += 1;
    }
  }

  // Layout of the new positions array:
  //   [0 .. vCount)                          — moved original vertices
  //   [vCount .. vCount + edgeMap.size)      — edge points (in insertion order)
  //   [vCount + edgeMap.size .. end)         — face points
  const edgeCount = edgeMap.size;
  const finalPositions: Vec3[] = new Array(vCount + edgeCount + fCount);
  const edgePointIndex = new Map<string, number>();
  const facePointIndex: number[] = new Array(fCount);

  // Edge points + accumulate edge-midpoint contributions for R.
  let edgeCursor = vCount;
  for (const [k, info] of edgeMap) {
    const A = positions[info.a];
    const B = positions[info.b];
    const mid: Vec3 = [
      (A[0] + B[0]) * 0.5,
      (A[1] + B[1]) * 0.5,
      (A[2] + B[2]) * 0.5,
    ];

    let edgePoint: Vec3;
    if (info.faceIndices.length === 2) {
      const fp0 = facePoints[info.faceIndices[0]];
      const fp1 = facePoints[info.faceIndices[1]];
      edgePoint = [
        (A[0] + B[0] + fp0[0] + fp1[0]) * 0.25,
        (A[1] + B[1] + fp0[1] + fp1[1]) * 0.25,
        (A[2] + B[2] + fp0[2] + fp1[2]) * 0.25,
      ];
    } else {
      edgePoint = v3clone(mid);
    }

    adjacentEdgeMidpointSum[info.a][0] += mid[0];
    adjacentEdgeMidpointSum[info.a][1] += mid[1];
    adjacentEdgeMidpointSum[info.a][2] += mid[2];
    adjacentEdgeMidpointCount[info.a] += 1;
    adjacentEdgeMidpointSum[info.b][0] += mid[0];
    adjacentEdgeMidpointSum[info.b][1] += mid[1];
    adjacentEdgeMidpointSum[info.b][2] += mid[2];
    adjacentEdgeMidpointCount[info.b] += 1;

    finalPositions[edgeCursor] = edgePoint;
    edgePointIndex.set(k, edgeCursor);
    edgeCursor += 1;
  }

  // Face points.
  let faceCursor = vCount + edgeCount;
  for (let f = 0; f < fCount; f++) {
    finalPositions[faceCursor] = facePoints[f];
    facePointIndex[f] = faceCursor;
    faceCursor += 1;
  }

  // Moved original vertices.
  for (let v = 0; v < vCount; v++) {
    const n = adjacentFacePointCount[v];
    if (n === 0) {
      finalPositions[v] = v3clone(positions[v]);
      continue;
    }
    const F: Vec3 = v3clone(adjacentFacePointSum[v]);
    v3divInPlace(F, n);
    const eN = adjacentEdgeMidpointCount[v];
    const R: Vec3 =
      eN > 0
        ? [
            adjacentEdgeMidpointSum[v][0] / eN,
            adjacentEdgeMidpointSum[v][1] / eN,
            adjacentEdgeMidpointSum[v][2] / eN,
          ]
        : [0, 0, 0];
    const P = positions[v];
    // (F + 2R + (n-3)P) / n
    finalPositions[v] = [
      (F[0] + 2 * R[0] + (n - 3) * P[0]) / n,
      (F[1] + 2 * R[1] + (n - 3) * P[1]) / n,
      (F[2] + 2 * R[2] + (n - 3) * P[2]) / n,
    ];
  }

  // 4. Build new faces: split each n-gon into n quads.
  const newFaces: number[][] = [];
  for (let f = 0; f < fCount; f++) {
    const verts = faces[f];
    const ek = faceEdgeKeys[f];
    const fpIdx = facePointIndex[f];
    const n = verts.length;
    for (let i = 0; i < n; i++) {
      const prev = (i - 1 + n) % n;
      const ePrev = edgePointIndex.get(ek[prev]);
      const eNext = edgePointIndex.get(ek[i]);
      if (ePrev === undefined || eNext === undefined) {
        throw new Error("missing edge point during face split");
      }
      newFaces.push([verts[i], eNext, fpIdx, ePrev]);
    }
  }

  return { positions: finalPositions, faces: newFaces };
}

// Public: subdivide a control mesh `level` times. level=0 returns the input.
export function subdivideCatmullClark(
  mesh: ControlMesh,
  level: number,
): { positions: Vec3[]; faces: number[][] } {
  const clamped = Math.max(0, Math.floor(level));
  let working = fromControlMesh(mesh);
  for (let i = 0; i < clamped; i++) {
    working = subdivideOnce(working);
  }
  return { positions: working.positions, faces: working.faces };
}

// Convert subdivided mesh into a THREE.BufferGeometry.
// Quads (and any remaining n-gons) are fan-triangulated. Vertex normals are
// the average of incident face normals.
export function controlMeshToBufferGeometry(
  mesh: ControlMesh,
  subdivisionLevel: number,
): THREE.BufferGeometry {
  const { positions, faces } = subdivideCatmullClark(mesh, subdivisionLevel);

  // Triangulate.
  const indices: number[] = [];
  for (const face of faces) {
    if (face.length < 3) continue;
    for (let i = 1; i < face.length - 1; i++) {
      indices.push(face[0], face[i], face[i + 1]);
    }
  }

  // Per-vertex normals via accumulation of triangle normals.
  const normalAcc: number[] = new Array(positions.length * 3).fill(0);
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const tmpC = new THREE.Vector3();
  const tmpAB = new THREE.Vector3();
  const tmpAC = new THREE.Vector3();
  const tmpN = new THREE.Vector3();
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i];
    const ib = indices[i + 1];
    const ic = indices[i + 2];
    tmpA.fromArray(positions[ia]);
    tmpB.fromArray(positions[ib]);
    tmpC.fromArray(positions[ic]);
    tmpAB.subVectors(tmpB, tmpA);
    tmpAC.subVectors(tmpC, tmpA);
    tmpN.crossVectors(tmpAB, tmpAC);
    // Don't normalize per-tri so larger triangles weigh more.
    normalAcc[ia * 3] += tmpN.x;
    normalAcc[ia * 3 + 1] += tmpN.y;
    normalAcc[ia * 3 + 2] += tmpN.z;
    normalAcc[ib * 3] += tmpN.x;
    normalAcc[ib * 3 + 1] += tmpN.y;
    normalAcc[ib * 3 + 2] += tmpN.z;
    normalAcc[ic * 3] += tmpN.x;
    normalAcc[ic * 3 + 1] += tmpN.y;
    normalAcc[ic * 3 + 2] += tmpN.z;
  }
  for (let i = 0; i < positions.length; i++) {
    const x = normalAcc[i * 3];
    const y = normalAcc[i * 3 + 1];
    const z = normalAcc[i * 3 + 2];
    const len = Math.hypot(x, y, z);
    if (len > 0) {
      normalAcc[i * 3] = x / len;
      normalAcc[i * 3 + 1] = y / len;
      normalAcc[i * 3 + 2] = z / len;
    }
  }

  const positionArr = new Float32Array(positions.length * 3);
  for (let i = 0; i < positions.length; i++) {
    positionArr[i * 3] = positions[i][0];
    positionArr[i * 3 + 1] = positions[i][1];
    positionArr[i * 3 + 2] = positions[i][2];
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positionArr, 3));
  geometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(new Float32Array(normalAcc), 3),
  );
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
