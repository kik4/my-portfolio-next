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

// Gaussian RBF weights for view keyframes. Returns weights normalized to sum
// to 1. For 0 keyframes returns []; for 1, returns [1].
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

  const dists = keyframes.map((k) =>
    sphericalAngleDistance(k.yaw, k.pitch, yaw, pitch),
  );
  const dMin = Math.min(...dists);
  const raw = dists.map((d) => Math.exp(-((d - dMin) ** 2) * inv2Sigma2));
  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum === 0) {
    const idx = dists.indexOf(dMin);
    const out = new Array(n).fill(0);
    out[idx] = 1;
    return out;
  }
  return raw.map((r) => r / sum);
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

const blendVisible = (flags: boolean[], weights: number[]): boolean => {
  let acc = 0;
  for (let i = 0; i < flags.length; i++) {
    acc += (flags[i] ? 1 : 0) * weights[i];
  }
  return acc >= 0.5;
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
