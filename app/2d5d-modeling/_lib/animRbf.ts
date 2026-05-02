import type { AnimKeyframe, AnimParamDef, ViewKeyframe } from "./types";

// Squared Euclidean distance between two paramValues maps over the union of
// their keys. Missing values are treated as 0 (matches the spec rule that
// "params not in paramValues are zero").
const paramDistanceSq = (
  a: Record<string, number>,
  b: Record<string, number>,
): number => {
  const keys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  let acc = 0;
  for (const k of keys) {
    const da = (a[k] ?? 0) - (b[k] ?? 0);
    acc += da * da;
  }
  return acc;
};

// Gaussian RBF weights for anim keyframes at a query point in N-dim
// paramValues space. sigma is in raw paramValues units (so e.g. for a param
// ranging 0..1, sigma=0.5 makes neighbours ~0.5 apart blend smoothly).
//
// Unlike the view RBF, anim keyframes are *deltas* applied on top of the view
// result. Returned weights are NOT normalized to sum to 1: each keyframe's
// contribution is independent. A keyframe far from currentParams contributes
// near-zero, and the static (all-zero anim) state corresponds to no
// keyframe-anchor contributing.
//
// The convention we adopt: when currentParams exactly equals a keyframe's
// paramValues, that keyframe contributes weight 1 (its full delta applies).
export const animRbfWeights = (
  keyframes: AnimKeyframe[],
  currentParams: Record<string, number>,
  sigma: number,
): number[] => {
  if (keyframes.length === 0) return [];
  const inv2Sigma2 = 1 / (2 * sigma * sigma);
  return keyframes.map((k) => {
    const d2 = paramDistanceSq(k.paramValues, currentParams);
    return Math.exp(-d2 * inv2Sigma2);
  });
};

// Apply anim deltas to a base view-interpolated keyframe. Each anim keyframe
// contributes `weight * delta` to every component (shape points, placement
// fields, alpha). Anchor delta is added then re-normalized so the result is a
// valid unit direction. Visibility is not touched by anim.
export const composeViewWithAnim = (
  base: ViewKeyframe,
  anim: AnimKeyframe[],
  weights: number[],
): ViewKeyframe => {
  if (anim.length === 0) return base;

  // Shape delta: same length as base.shape.basePoints. Anim deltas with a
  // mismatching length contribute 0 for the missing entries (defensive).
  const pointCount = base.shape.basePoints.length;
  const blendedPoints: [number, number][] = base.shape.basePoints.map((p) => [
    p[0],
    p[1],
  ]);
  for (let k = 0; k < anim.length; k++) {
    const w = weights[k];
    if (w === 0) continue;
    const delta = anim[k].shapeDelta;
    for (let p = 0; p < pointCount; p++) {
      const d = delta[p];
      if (!d) continue;
      blendedPoints[p][0] += d[0] * w;
      blendedPoints[p][1] += d[1] * w;
    }
  }

  let anchorX = base.placement.anchor[0];
  let anchorY = base.placement.anchor[1];
  let anchorZ = base.placement.anchor[2];
  let offsetNormal = base.placement.offsetNormal;
  let offsetTangentX = base.placement.offsetTangent[0];
  let offsetTangentY = base.placement.offsetTangent[1];
  let rotPitch = base.placement.rotationOffset[0];
  let rotYaw = base.placement.rotationOffset[1];
  let rotRoll = base.placement.rotationOffset[2];
  let scaleX = base.placement.scale[0];
  let scaleY = base.placement.scale[1];
  let alpha = base.alpha;

  for (let k = 0; k < anim.length; k++) {
    const w = weights[k];
    if (w === 0) continue;
    const d = anim[k];
    anchorX += d.placementDelta.anchorDelta[0] * w;
    anchorY += d.placementDelta.anchorDelta[1] * w;
    anchorZ += d.placementDelta.anchorDelta[2] * w;
    offsetNormal += d.placementDelta.offsetNormalDelta * w;
    offsetTangentX += d.placementDelta.offsetTangentDelta[0] * w;
    offsetTangentY += d.placementDelta.offsetTangentDelta[1] * w;
    rotPitch += d.placementDelta.rotationOffsetDelta[0] * w;
    rotYaw += d.placementDelta.rotationOffsetDelta[1] * w;
    rotRoll += d.placementDelta.rotationOffsetDelta[2] * w;
    scaleX += d.placementDelta.scaleDelta[0] * w;
    scaleY += d.placementDelta.scaleDelta[1] * w;
    alpha += d.alphaDelta * w;
  }

  // Re-normalize anchor.
  const anchorLen = Math.hypot(anchorX, anchorY, anchorZ);
  const anchor: [number, number, number] =
    anchorLen > 0
      ? [anchorX / anchorLen, anchorY / anchorLen, anchorZ / anchorLen]
      : [0, 0, 1];

  return {
    id: base.id,
    yaw: base.yaw,
    pitch: base.pitch,
    shape: { basePoints: blendedPoints, closed: base.shape.closed },
    placement: {
      anchor,
      offsetNormal,
      offsetTangent: [offsetTangentX, offsetTangentY],
      rotationOffset: [rotPitch, rotYaw, rotRoll],
      scale: [scaleX, scaleY],
    },
    visible: base.visible,
    alpha: Math.max(0, Math.min(1, alpha)),
  };
};

// Build a default animKeyframe for the part: zero deltas matching the part's
// current shape length. Useful when adding a keyframe via the UI.
export const buildEmptyAnimKeyframe = (
  id: string,
  paramValues: Record<string, number>,
  shapePointCount: number,
): AnimKeyframe => ({
  id,
  paramValues,
  shapeDelta: Array.from({ length: shapePointCount }, () => [0, 0]),
  placementDelta: {
    anchorDelta: [0, 0, 0],
    offsetNormalDelta: 0,
    offsetTangentDelta: [0, 0],
    rotationOffsetDelta: [0, 0, 0],
    scaleDelta: [0, 0],
  },
  alphaDelta: 0,
});

// Convenience: expand currentAnimParams record with defaults from registry.
export const fillAnimDefaults = (
  current: Record<string, number>,
  defs: AnimParamDef[],
): Record<string, number> => {
  const out: Record<string, number> = { ...current };
  for (const d of defs) {
    if (out[d.name] === undefined) out[d.name] = d.default;
  }
  return out;
};
