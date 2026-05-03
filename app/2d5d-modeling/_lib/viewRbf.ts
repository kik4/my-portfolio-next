import { AFFINE_IDENTITY, type AffineMatrix, blendAffines } from "./affine";
import type {
  ChildGroupViewKeyframe,
  PartViewKeyframe,
  RootGroupViewKeyframe,
  Vec2,
  Vec3,
} from "./types";

// Convert (yaw, pitch) in degrees to a unit vector on the sphere. yaw rotates
// around +Y (yaw=0 -> +Z, yaw=90 -> +X). pitch tilts up from the equator.
const yawPitchToVec = (yawDeg: number, pitchDeg: number): Vec3 => {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const cp = Math.cos(pitch);
  return [cp * Math.sin(yaw), Math.sin(pitch), cp * Math.cos(yaw)];
};

const sphericalAngleDistance = (
  aYaw: number,
  aPitch: number,
  bYaw: number,
  bPitch: number,
): number => {
  const a = yawPitchToVec(aYaw, aPitch);
  const b = yawPitchToVec(bYaw, bPitch);
  const dot = Math.max(
    -1,
    Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]),
  );
  return Math.acos(dot);
};

// Gaussian RBF weights for view keyframes computed by EXACT interpolation:
// solve `K w = k(query)` where K[i][j] = kernel(kf_i, kf_j) and k_i =
// kernel(query, kf_i). This guarantees that querying exactly at any
// keyframe's (yaw, pitch) returns that keyframe's stored value untouched
// by the others — the property the previous "normalize Σw to 1" form
// silently broke (a 90°-away keyframe still leaked ~1% influence at the
// other keyframe's angle).
//
// Tiny ridge `RIDGE` is added to K's diagonal so the system stays solvable
// when two keyframes happen to share angles. Returns [] for 0 keyframes
// and [1] for 1.
const RIDGE = 1e-8;

export const viewRbfWeights = (
  keyframes: { yaw: number; pitch: number }[],
  yaw: number,
  pitch: number,
  sigmaDeg: number,
): number[] => {
  const n = keyframes.length;
  if (n === 0) return [];
  if (n === 1) return [1];

  const sigmaRad = (sigmaDeg * Math.PI) / 180;
  const inv2Sigma2 = 1 / (2 * sigmaRad * sigmaRad);

  // K matrix: kernel between every pair of keyframes (symmetric).
  const K: number[][] = [];
  for (let i = 0; i < n; i++) {
    K.push(new Array(n));
    for (let j = 0; j < n; j++) {
      if (i === j) {
        K[i][j] = 1 + RIDGE;
        continue;
      }
      const d = sphericalAngleDistance(
        keyframes[i].yaw,
        keyframes[i].pitch,
        keyframes[j].yaw,
        keyframes[j].pitch,
      );
      K[i][j] = Math.exp(-(d * d) * inv2Sigma2);
    }
  }

  // k vector: kernel between the query angle and each keyframe.
  const k = keyframes.map((kf) => {
    const d = sphericalAngleDistance(kf.yaw, kf.pitch, yaw, pitch);
    return Math.exp(-(d * d) * inv2Sigma2);
  });

  // Solve K w = k via Gaussian elimination on the augmented matrix [K | k].
  return solveLinearSystem(K, k);
};

// Gauss-Jordan elimination with partial pivoting. Mutates A and b in place.
// Caller passes copies if needed; here viewRbfWeights builds fresh arrays
// every call.
const solveLinearSystem = (A: number[][], b: number[]): number[] => {
  const n = b.length;
  // Augmented matrix [A | b].
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Find pivot: largest absolute value in this column at or below the
    // current row.
    let pivot = col;
    let maxAbs = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(M[r][col]);
      if (v > maxAbs) {
        maxAbs = v;
        pivot = r;
      }
    }
    if (maxAbs < 1e-12) {
      // Singular system — fall back to "use the nearest keyframe with
      // weight 1, others 0". Shouldn't happen with the ridge term but
      // guard for safety.
      const out = new Array(n).fill(0);
      let bestIdx = 0;
      let bestVal = -Infinity;
      for (let i = 0; i < n; i++) {
        if (b[i] > bestVal) {
          bestVal = b[i];
          bestIdx = i;
        }
      }
      out[bestIdx] = 1;
      return out;
    }
    if (pivot !== col) {
      const tmp = M[col];
      M[col] = M[pivot];
      M[pivot] = tmp;
    }
    // Normalize the pivot row so M[col][col] = 1.
    const inv = 1 / M[col][col];
    for (let j = col; j <= n; j++) M[col][j] *= inv;
    // Eliminate in every other row.
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      if (factor === 0) continue;
      for (let j = col; j <= n; j++) M[r][j] -= factor * M[col][j];
    }
  }
  return M.map((row) => row[n]);
};

// ===== blending helpers =====

const blendScalar = (values: number[], weights: number[]): number => {
  let acc = 0;
  for (let i = 0; i < values.length; i++) acc += values[i] * weights[i];
  return acc;
};

const blendVec3 = (vs: Vec3[], weights: number[]): Vec3 => {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < vs.length; i++) {
    const w = weights[i];
    x += vs[i][0] * w;
    y += vs[i][1] * w;
    z += vs[i][2] * w;
  }
  return [x, y, z];
};

// Exact-interpolation weights are not bounded to [0, 1] (they may be
// slightly negative or exceed 1 between keyframes), so a linear "weighted
// 0/1 sum" doesn't make sense for a boolean. Take the visibility of the
// keyframe with the largest weight as the answer — this matches the
// nearest-keyframe intuition the editor uses elsewhere.
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
  const out: Vec2[] = [];
  for (let p = 0; p < pointCount; p++) {
    let x = 0;
    let y = 0;
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
  sigmaDeg: number,
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
  const weights = viewRbfWeights(keyframes, yaw, pitch, sigmaDeg);
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
    affine: blendAffines(
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
  sigmaDeg: number,
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
  const weights = viewRbfWeights(keyframes, yaw, pitch, sigmaDeg);
  return {
    anchor: blendVec3(
      keyframes.map((k) => k.anchor),
      weights,
    ),
    affine: blendAffines(
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
  sigmaDeg: number,
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
  const weights = viewRbfWeights(keyframes, yaw, pitch, sigmaDeg);
  return {
    affine: blendAffines(
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
