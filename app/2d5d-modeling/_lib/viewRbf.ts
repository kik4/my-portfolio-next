import type { ViewKeyframe } from "./types";

// Convert (yaw, pitch) in degrees to a unit vector on the sphere. yaw rotates
// around +Y (yaw=0 -> +Z, yaw=90 -> +X). pitch tilts up from the equator
// (pitch=0 on equator, pitch=90 at +Y pole).
const yawPitchToVec = (
  yawDeg: number,
  pitchDeg: number,
): [number, number, number] => {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const cp = Math.cos(pitch);
  return [cp * Math.sin(yaw), Math.sin(pitch), cp * Math.cos(yaw)];
};

// Angular distance (radians) between two (yaw, pitch) directions on the sphere.
// Treats yaw as periodic (yaw=0 and yaw=360 are the same direction).
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

// Compute Gaussian RBF weights for the given keyframes at the query (yaw, pitch).
// sigmaDeg controls the falloff width (in degrees). Weights are normalized so
// that they sum to 1.
//
// Returns an array of weights with the same length and order as keyframes.
// If keyframes is empty, returns [].
// If exactly one keyframe, returns [1].
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

  // Compute raw Gaussian weights. To avoid numerical underflow when all
  // distances are large, subtract the min distance before exponentiating.
  const dists = keyframes.map((k) =>
    sphericalAngleDistance(k.yaw, k.pitch, yaw, pitch),
  );
  const dMin = Math.min(...dists);
  const raw = dists.map((d) => Math.exp(-((d - dMin) ** 2) * inv2Sigma2));
  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum === 0) {
    // Fall back to nearest-neighbor.
    const idx = dists.indexOf(dMin);
    const out = new Array(n).fill(0);
    out[idx] = 1;
    return out;
  }
  return raw.map((r) => r / sum);
};

// Linearly blend per-keyframe scalar values with the given weights.
export const blendScalar = (values: number[], weights: number[]): number => {
  let acc = 0;
  for (let i = 0; i < values.length; i++) acc += values[i] * weights[i];
  return acc;
};

// Linearly blend per-keyframe Vec2 / Vec3 arrays.
export const blendVecArray = <T extends number[]>(
  vectors: T[],
  weights: number[],
): T => {
  const dim = vectors[0].length;
  const out = new Array(dim).fill(0) as T;
  for (let i = 0; i < vectors.length; i++) {
    const w = weights[i];
    for (let d = 0; d < dim; d++) out[d] += vectors[i][d] * w;
  }
  return out;
};

// Blend visibility: each keyframe contributes its visible flag (1 / 0). The
// result is true if the weighted sum exceeds 0.5.
export const blendVisible = (flags: boolean[], weights: number[]): boolean => {
  let acc = 0;
  for (let i = 0; i < flags.length; i++) acc += (flags[i] ? 1 : 0) * weights[i];
  return acc >= 0.5;
};

// Interpolate every component of the keyframes producing a single composite
// view keyframe at (yaw, pitch). All keyframes must share the same shape
// length (this is enforced by the part editor; defensive here just in case).
export const interpolateViewKeyframes = (
  keyframes: ViewKeyframe[],
  yaw: number,
  pitch: number,
  sigmaDeg: number,
): ViewKeyframe => {
  if (keyframes.length === 0) {
    throw new Error("interpolateViewKeyframes: empty keyframes");
  }
  if (keyframes.length === 1) return keyframes[0];

  const weights = viewRbfWeights(keyframes, yaw, pitch, sigmaDeg);

  // Determine the canonical point count from the first keyframe; clip others.
  const pointCount = keyframes[0].shape.basePoints.length;

  const blendedShape: [number, number][] = [];
  for (let p = 0; p < pointCount; p++) {
    const points = keyframes.map(
      (k) => (k.shape.basePoints[p] ?? [0, 0]) as [number, number],
    );
    blendedShape.push(blendVecArray(points, weights));
  }

  const blendedAnchor = blendVecArray(
    keyframes.map((k) => k.placement.anchor),
    weights,
  );
  const anchorLen = Math.hypot(
    blendedAnchor[0],
    blendedAnchor[1],
    blendedAnchor[2],
  );
  const anchor: [number, number, number] =
    anchorLen > 0
      ? [
          blendedAnchor[0] / anchorLen,
          blendedAnchor[1] / anchorLen,
          blendedAnchor[2] / anchorLen,
        ]
      : [0, 0, 1];

  const blendedOffsetTangent = blendVecArray(
    keyframes.map((k) => k.placement.offsetTangent),
    weights,
  );
  const blendedRotationOffset = blendVecArray(
    keyframes.map((k) => k.placement.rotationOffset),
    weights,
  );
  const blendedScale = blendVecArray(
    keyframes.map((k) => k.placement.scale),
    weights,
  );

  return {
    id: "interpolated",
    yaw,
    pitch,
    shape: {
      basePoints: blendedShape,
      closed: keyframes[0].shape.closed,
    },
    placement: {
      anchor,
      offsetNormal: blendScalar(
        keyframes.map((k) => k.placement.offsetNormal),
        weights,
      ),
      offsetTangent: blendedOffsetTangent,
      rotationOffset: blendedRotationOffset,
      scale: blendedScale,
    },
    visible: blendVisible(
      keyframes.map((k) => k.visible),
      weights,
    ),
    alpha: blendScalar(
      keyframes.map((k) => k.alpha),
      weights,
    ),
  };
};
