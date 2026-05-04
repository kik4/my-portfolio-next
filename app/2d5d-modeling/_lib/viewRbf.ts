import { AFFINE_IDENTITY, type AffineMatrix } from "./affine";
import type {
  ChildGroupViewKeyframe,
  PartViewKeyframe,
  RootGroupViewKeyframe,
  Vec2,
  Vec3,
} from "./types";

// View-keyframe interpolation in (yaw, pitch) degree space.
//
// The previous Gaussian-RBF formulation mixed in distant keyframes whenever
// the query angle was equidistant from them in spherical-arc terms — e.g.
// yawing past the equator with a high-pitch keyframe nearby caused the
// pitch=0 result to drift toward that high-pitch keyframe. The replacement
// uses a Delaunay triangulation of the keyframes on the (yaw, pitch) plane
// and barycentric coordinates inside the triangle the query lands in, so
// only the three surrounding keyframes ever contribute. Outside the
// triangulation's convex hull (or in degenerate collinear/duplicate cases)
// we fall back to nearest-edge or nearest-keyframe interpolation, which
// likewise touches at most two keyframes.
//
// Convention: keyframes[0] is the "base"; the returned weights satisfy
// `result = (1 - Σ w) × base + Σ w_i × kf_i`. At any keyframe's exact
// (yaw, pitch) the corresponding w is 1 and the others are 0, so callers
// recover the stored value untouched.

// ===== triangulation =====

type Tri = [number, number, number]; // indices into the keyframe list

interface Triangulation {
  // Either a triangulation, or a 1-D fallback (collinear / 2 points).
  kind: "tri" | "line";
  tris: Tri[]; // for "tri"
  order: number[]; // for "line": indices sorted along the spread axis
}

// Bowyer–Watson Delaunay on points in 2D. Returns triangle indices into the
// caller's point list. Robust enough for tiny keyframe counts (<100); we
// don't bother with more efficient incremental structures.
const triangulate = (pts: Vec2[]): Triangulation => {
  const n = pts.length;
  if (n < 3) return { kind: "line", tris: [], order: rangeSorted(pts) };

  // Detect collinearity: if the bounding axis is nearly degenerate, treat
  // as a 1-D problem.
  const minX = Math.min(...pts.map((p) => p[0]));
  const maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1]));
  const maxY = Math.max(...pts.map((p) => p[1]));
  const dx = maxX - minX;
  const dy = maxY - minY;
  const span = Math.max(dx, dy);
  if (span < 1e-9) {
    // All points coincide; treat any one as the answer.
    return { kind: "line", tris: [], order: pts.map((_, i) => i) };
  }
  // Check actual collinearity: compute signed area of every triple; if the
  // largest absolute area is negligible relative to the spread, fall back
  // to 1-D.
  let maxAbsArea = 0;
  for (let i = 1; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = pts[0];
      const b = pts[i];
      const c = pts[j];
      const area = Math.abs(
        (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
      );
      if (area > maxAbsArea) maxAbsArea = area;
    }
  }
  if (maxAbsArea < span * span * 1e-9) {
    return { kind: "line", tris: [], order: rangeSorted(pts) };
  }

  // Super-triangle that comfortably contains all points.
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const M = Math.max(dx, dy) * 20 + 1;
  const sIdx0 = n;
  const sIdx1 = n + 1;
  const sIdx2 = n + 2;
  const allPts: Vec2[] = [
    ...pts,
    [cx - M, cy - M],
    [cx + M, cy - M],
    [cx, cy + M],
  ];

  let tris: Tri[] = [[sIdx0, sIdx1, sIdx2]];

  for (let p = 0; p < n; p++) {
    const bad: Tri[] = [];
    const good: Tri[] = [];
    for (const t of tris) {
      if (inCircumcircle(allPts[p], allPts[t[0]], allPts[t[1]], allPts[t[2]])) {
        bad.push(t);
      } else {
        good.push(t);
      }
    }
    // Find the boundary edges of the bad-triangle hole (edges that appear
    // in exactly one bad triangle).
    const edgeCount = new Map<string, [number, number]>();
    const edgeMult = new Map<string, number>();
    for (const t of bad) {
      const edges: [number, number][] = [
        [t[0], t[1]],
        [t[1], t[2]],
        [t[2], t[0]],
      ];
      for (const [a, b] of edges) {
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        edgeMult.set(key, (edgeMult.get(key) ?? 0) + 1);
        edgeCount.set(key, [a, b]);
      }
    }
    tris = good;
    for (const [key, ab] of edgeCount) {
      if ((edgeMult.get(key) ?? 0) === 1) {
        tris.push([ab[0], ab[1], p]);
      }
    }
  }

  // Drop triangles that touch the super-triangle.
  const result: Tri[] = [];
  for (const t of tris) {
    if (t[0] >= n || t[1] >= n || t[2] >= n) continue;
    result.push(t);
  }
  if (result.length === 0) {
    // Triangulation fell apart (extreme degeneracy that didn't trip the
    // collinearity check). Fall back to 1-D.
    return { kind: "line", tris: [], order: rangeSorted(pts) };
  }
  return { kind: "tri", tris: result, order: [] };
};

const rangeSorted = (pts: Vec2[]): number[] => {
  // Sort indices along the dominant axis so 1-D linear interpolation is
  // monotone.
  const n = pts.length;
  if (n === 0) return [];
  const minX = Math.min(...pts.map((p) => p[0]));
  const maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1]));
  const maxY = Math.max(...pts.map((p) => p[1]));
  const useX = maxX - minX >= maxY - minY;
  const idx = pts.map((_, i) => i);
  idx.sort((a, b) => (useX ? pts[a][0] - pts[b][0] : pts[a][1] - pts[b][1]));
  return idx;
};

const inCircumcircle = (p: Vec2, a: Vec2, b: Vec2, c: Vec2): boolean => {
  // Standard incircle determinant test. Returns true if `p` is strictly
  // inside the circumcircle of triangle (a, b, c) assuming (a, b, c) is
  // counter-clockwise; we make it orientation-independent by taking the
  // absolute value of the determinant comparison.
  const ax = a[0] - p[0];
  const ay = a[1] - p[1];
  const bx = b[0] - p[0];
  const by = b[1] - p[1];
  const cx = c[0] - p[0];
  const cy = c[1] - p[1];
  const det =
    (ax * ax + ay * ay) * (bx * cy - cx * by) -
    (bx * bx + by * by) * (ax * cy - cx * ay) +
    (cx * cx + cy * cy) * (ax * by - bx * ay);
  // Match orientation of (a, b, c).
  const orient = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return orient > 0 ? det > 1e-12 : det < -1e-12;
};

// ===== barycentric / nearest-edge fallback =====

const barycentric = (
  p: Vec2,
  a: Vec2,
  b: Vec2,
  c: Vec2,
): [number, number, number] | null => {
  const v0x = b[0] - a[0];
  const v0y = b[1] - a[1];
  const v1x = c[0] - a[0];
  const v1y = c[1] - a[1];
  const v2x = p[0] - a[0];
  const v2y = p[1] - a[1];
  const denom = v0x * v1y - v1x * v0y;
  if (Math.abs(denom) < 1e-12) return null;
  const v = (v2x * v1y - v1x * v2y) / denom;
  const w = (v0x * v2y - v2x * v0y) / denom;
  const u = 1 - v - w;
  return [u, v, w];
};

const distSq = (a: Vec2, b: Vec2): number => {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
};

// Project the query onto segment (a, b); return the parameter t in [0, 1].
const projectOntoSegment = (p: Vec2, a: Vec2, b: Vec2): number => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-18) return 0;
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  return Math.max(0, Math.min(1, t));
};

// Build a sparse weight vector of length n from a single contributing index
// or from 2 / 3 indices with their weights.
const wOne = (n: number, i: number): number[] => {
  const w = new Array(n).fill(0);
  w[i] = 1;
  return w;
};
const wTwo = (n: number, i: number, j: number, ti: number, tj: number) => {
  const w = new Array(n).fill(0);
  w[i] = ti;
  w[j] = tj;
  return w;
};
const wThree = (
  n: number,
  i: number,
  j: number,
  k: number,
  ti: number,
  tj: number,
  tk: number,
) => {
  const w = new Array(n).fill(0);
  w[i] = ti;
  w[j] = tj;
  w[k] = tk;
  return w;
};

// ===== public weight API =====

// Returns a weight vector w with |w| = keyframes.length such that
// `result = (1 - Σ w) × keyframes[0].value + Σ w_i × keyframes[i].value`
// reproduces stored values at every keyframe's angle and only blends the
// 1–3 surrounding keyframes elsewhere.
export const viewInterpWeights = (
  keyframes: { yaw: number; pitch: number }[],
  yaw: number,
  pitch: number,
): number[] => {
  const n = keyframes.length;
  if (n === 0) return [];
  if (n === 1) return [1];

  const pts: Vec2[] = keyframes.map((k) => [k.yaw, k.pitch]);
  const query: Vec2 = [yaw, pitch];

  // Snap to an exact keyframe if the query coincides with one — saves us
  // from numerical wobble in barycentric near vertices.
  for (let i = 0; i < n; i++) {
    if (distSq(pts[i], query) < 1e-12) return wOne(n, i);
  }

  if (n === 2) {
    const t = projectOntoSegment(query, pts[0], pts[1]);
    return wTwo(n, 0, 1, 1 - t, t);
  }

  const tri = triangulate(pts);
  if (tri.kind === "line") {
    return weightsAlongLine(pts, query, tri.order);
  }

  // Look for the triangle containing the query.
  let best: { tri: Tri; bary: [number, number, number] } | null = null;
  for (const t of tri.tris) {
    const bary = barycentric(query, pts[t[0]], pts[t[1]], pts[t[2]]);
    if (!bary) continue;
    const [u, v, w] = bary;
    const eps = -1e-9;
    if (u >= eps && v >= eps && w >= eps) {
      best = { tri: t, bary };
      break;
    }
  }
  if (best) {
    const [u, v, w] = best.bary;
    return wThree(n, best.tri[0], best.tri[1], best.tri[2], u, v, w);
  }

  // Outside the convex hull: project the query onto every triangulation
  // edge and pick the closest projection. Two-keyframe blend.
  const hullEdges = collectBoundaryEdges(tri.tris);
  let bestEdge: { i: number; j: number; t: number; d2: number } | null = null;
  for (const [i, j] of hullEdges) {
    const t = projectOntoSegment(query, pts[i], pts[j]);
    const px = pts[i][0] + (pts[j][0] - pts[i][0]) * t;
    const py = pts[i][1] + (pts[j][1] - pts[i][1]) * t;
    const d2 = distSq(query, [px, py]);
    if (!bestEdge || d2 < bestEdge.d2) bestEdge = { i, j, t, d2 };
  }
  if (bestEdge) {
    return wTwo(n, bestEdge.i, bestEdge.j, 1 - bestEdge.t, bestEdge.t);
  }

  // Last-ditch fallback: nearest single keyframe.
  let nearest = 0;
  let nearestD2 = Infinity;
  for (let i = 0; i < n; i++) {
    const d2 = distSq(query, pts[i]);
    if (d2 < nearestD2) {
      nearestD2 = d2;
      nearest = i;
    }
  }
  return wOne(n, nearest);
};

// Edges that appear in exactly one triangle = convex-hull edges of the
// triangulation.
const collectBoundaryEdges = (tris: Tri[]): [number, number][] => {
  const count = new Map<string, [number, number]>();
  const mult = new Map<string, number>();
  for (const t of tris) {
    const edges: [number, number][] = [
      [t[0], t[1]],
      [t[1], t[2]],
      [t[2], t[0]],
    ];
    for (const [a, b] of edges) {
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      mult.set(key, (mult.get(key) ?? 0) + 1);
      count.set(key, [a, b]);
    }
  }
  const out: [number, number][] = [];
  for (const [key, ab] of count) {
    if ((mult.get(key) ?? 0) === 1) out.push(ab);
  }
  return out;
};

// 1-D linear interpolation along an axis-sorted index list. Used when the
// keyframes are collinear (or nearly so) on the (yaw, pitch) plane.
const weightsAlongLine = (
  pts: Vec2[],
  query: Vec2,
  order: number[],
): number[] => {
  const n = pts.length;
  if (order.length === 0) return wOne(n, 0);
  if (order.length === 1) return wOne(n, order[0]);

  // Find the segment in `order` that contains the projected query, then
  // blend its two endpoints. If the query projects beyond either end, clamp
  // to that single endpoint (no extrapolation).
  // We project onto the line through the first and last sorted points.
  const a = pts[order[0]];
  const b = pts[order[order.length - 1]];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-18) return wOne(n, order[0]);
  const tQuery = ((query[0] - a[0]) * dx + (query[1] - a[1]) * dy) / len2;
  // Cumulative parameters per ordered point along the same line.
  const ts = order.map((i) => {
    const dxi = pts[i][0] - a[0];
    const dyi = pts[i][1] - a[1];
    return (dxi * dx + dyi * dy) / len2;
  });
  if (tQuery <= ts[0]) return wOne(n, order[0]);
  if (tQuery >= ts[ts.length - 1]) return wOne(n, order[order.length - 1]);
  for (let s = 0; s < ts.length - 1; s++) {
    if (tQuery >= ts[s] && tQuery <= ts[s + 1]) {
      const span = ts[s + 1] - ts[s];
      const local = span < 1e-18 ? 0 : (tQuery - ts[s]) / span;
      return wTwo(n, order[s], order[s + 1], 1 - local, local);
    }
  }
  return wOne(n, order[0]);
};

// ===== blending helpers =====
//
// Convention: all blend functions interpret `keyframes[0]` as the base
// frame and the remaining keyframes' values as deltas relative to it.
// Concretely they compute `base + Σ w_i × (values[i] - base)`, which
// rearranges to `(1 - Σ w) × values[0] + Σ w_i × values[i]`. With the
// triangulation weights, querying at any kf's angle yields w on that one
// keyframe = 1 and the others = 0, so callers recover the stored value.

const sumWeights = (weights: number[]): number => {
  let s = 0;
  for (let i = 0; i < weights.length; i++) s += weights[i];
  return s;
};

const blendScalar = (values: number[], weights: number[]): number => {
  if (values.length === 0) return 0;
  const base = values[0];
  const wSum = sumWeights(weights);
  let acc = (1 - wSum) * base;
  for (let i = 0; i < values.length; i++) acc += values[i] * weights[i];
  return acc;
};

const blendVec3 = (vs: Vec3[], weights: number[]): Vec3 => {
  if (vs.length === 0) return [0, 0, 0];
  const base = vs[0];
  const wSum = sumWeights(weights);
  const f = 1 - wSum;
  let x = f * base[0];
  let y = f * base[1];
  let z = f * base[2];
  for (let i = 0; i < vs.length; i++) {
    const w = weights[i];
    x += vs[i][0] * w;
    y += vs[i][1] * w;
    z += vs[i][2] * w;
  }
  return [x, y, z];
};

const blendAffinesView = (
  affines: AffineMatrix[],
  weights: number[],
): AffineMatrix => {
  if (affines.length === 0) return [...AFFINE_IDENTITY] as AffineMatrix;
  const base = affines[0];
  const wSum = sumWeights(weights);
  const f = 1 - wSum;
  const out: AffineMatrix = [
    f * base[0],
    f * base[1],
    f * base[2],
    f * base[3],
    f * base[4],
    f * base[5],
  ];
  for (let i = 0; i < affines.length; i++) {
    const w = weights[i];
    const m = affines[i];
    for (let k = 0; k < 6; k++) out[k] += m[k] * w;
  }
  return out;
};

// Visibility: take the visibility of the keyframe with the largest weight.
// Matches the nearest-keyframe intuition the editor uses elsewhere.
const blendVisible = (flags: boolean[], weights: number[]): boolean => {
  let bestIdx = 0;
  let bestWeight = -Infinity;
  for (let i = 0; i < flags.length; i++) {
    if (weights[i] > bestWeight) {
      bestWeight = weights[i];
      bestIdx = i;
    }
  }
  return flags[bestIdx] ?? true;
};

const blendBasePoints = (
  perKf: Vec2[][],
  weights: number[],
  pointCount: number,
): Vec2[] => {
  if (perKf.length === 0) return [];
  const baseFrame = perKf[0];
  const wSum = sumWeights(weights);
  const f = 1 - wSum;
  const out: Vec2[] = [];
  for (let p = 0; p < pointCount; p++) {
    const basePt = baseFrame[p] ?? [0, 0];
    let x = f * basePt[0];
    let y = f * basePt[1];
    for (let i = 0; i < perKf.length; i++) {
      const pt = perKf[i][p] ?? [0, 0];
      x += pt[0] * weights[i];
      y += pt[1] * weights[i];
    }
    out.push([x, y]);
  }
  return out;
};

// ===== part view keyframe interpolation =====

export interface InterpolatedPartView {
  shape: { basePoints: Vec2[]; closed: boolean };
  affine: AffineMatrix;
  alpha: number;
  visible: boolean;
}

export const interpolatePartViewKeyframes = (
  keyframes: PartViewKeyframe[],
  yaw: number,
  pitch: number,
): InterpolatedPartView => {
  if (keyframes.length === 0) {
    throw new Error("interpolatePartViewKeyframes: empty keyframes");
  }
  if (keyframes.length === 1) {
    const k = keyframes[0];
    return {
      shape: {
        basePoints: k.shape.basePoints.map((p) => [p[0], p[1]] as Vec2),
        closed: k.shape.closed,
      },
      affine: [...k.affine] as AffineMatrix,
      alpha: k.alpha,
      visible: k.visible,
    };
  }
  const weights = viewInterpWeights(keyframes, yaw, pitch);
  const pointCount = keyframes[0].shape.basePoints.length;
  return {
    shape: {
      basePoints: blendBasePoints(
        keyframes.map((k) => k.shape.basePoints),
        weights,
        pointCount,
      ),
      closed: keyframes[0].shape.closed,
    },
    affine: blendAffinesView(
      keyframes.map((k) => k.affine),
      weights,
    ),
    alpha: blendScalar(
      keyframes.map((k) => k.alpha),
      weights,
    ),
    visible: blendVisible(
      keyframes.map((k) => k.visible),
      weights,
    ),
  };
};

// ===== root group view keyframe interpolation =====

export interface InterpolatedRootGroupView {
  anchor: Vec3;
  affine: AffineMatrix;
  alpha: number;
  visible: boolean;
}

export const interpolateRootGroupViewKeyframes = (
  keyframes: RootGroupViewKeyframe[],
  yaw: number,
  pitch: number,
): InterpolatedRootGroupView => {
  if (keyframes.length === 0) {
    return {
      anchor: [0, 0, 0],
      affine: [...AFFINE_IDENTITY] as AffineMatrix,
      alpha: 1,
      visible: true,
    };
  }
  if (keyframes.length === 1) {
    const k = keyframes[0];
    return {
      anchor: [...k.anchor] as Vec3,
      affine: [...k.affine] as AffineMatrix,
      alpha: k.alpha,
      visible: k.visible,
    };
  }
  const weights = viewInterpWeights(keyframes, yaw, pitch);
  return {
    anchor: blendVec3(
      keyframes.map((k) => k.anchor),
      weights,
    ),
    affine: blendAffinesView(
      keyframes.map((k) => k.affine),
      weights,
    ),
    alpha: blendScalar(
      keyframes.map((k) => k.alpha),
      weights,
    ),
    visible: blendVisible(
      keyframes.map((k) => k.visible),
      weights,
    ),
  };
};

// ===== child group view keyframe interpolation =====

export interface InterpolatedChildGroupView {
  affine: AffineMatrix;
  alpha: number;
  visible: boolean;
}

export const interpolateChildGroupViewKeyframes = (
  keyframes: ChildGroupViewKeyframe[],
  yaw: number,
  pitch: number,
): InterpolatedChildGroupView => {
  if (keyframes.length === 0) {
    return {
      affine: [...AFFINE_IDENTITY] as AffineMatrix,
      alpha: 1,
      visible: true,
    };
  }
  if (keyframes.length === 1) {
    const k = keyframes[0];
    return {
      affine: [...k.affine] as AffineMatrix,
      alpha: k.alpha,
      visible: k.visible,
    };
  }
  const weights = viewInterpWeights(keyframes, yaw, pitch);
  return {
    affine: blendAffinesView(
      keyframes.map((k) => k.affine),
      weights,
    ),
    alpha: blendScalar(
      keyframes.map((k) => k.alpha),
      weights,
    ),
    visible: blendVisible(
      keyframes.map((k) => k.visible),
      weights,
    ),
  };
};
