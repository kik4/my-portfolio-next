import { AFFINE_ZERO, type AffineMatrix } from "./affine";
import type {
  AnimParamDef,
  ChildGroupAnimKeyframe,
  PartAnimKeyframe,
  RootGroupAnimKeyframe,
  Vec2,
  Vec3,
} from "./types";
import type {
  InterpolatedChildGroupView,
  InterpolatedPartView,
  InterpolatedRootGroupView,
} from "./viewRbf";

// Squared Euclidean distance between two paramValues maps. Missing values
// count as 0.
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

// Anim keyframe weights are NOT normalized (each keyframe contributes its
// delta independently, so far-away keyframes shrink to ~0).
export const animRbfWeights = (
  keyframes: { paramValues: Record<string, number> }[],
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

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// ===== part anim composition =====

export const composePartViewWithAnim = (
  base: InterpolatedPartView,
  anim: PartAnimKeyframe[],
  currentParams: Record<string, number>,
  sigma: number,
): InterpolatedPartView => {
  if (anim.length === 0) return base;
  const weights = animRbfWeights(anim, currentParams, sigma);
  const pointCount = base.shape.basePoints.length;

  const points: Vec2[] = base.shape.basePoints.map((p) => [p[0], p[1]]);
  const affine: AffineMatrix = [...base.affine] as AffineMatrix;
  let alpha = base.alpha;

  for (let k = 0; k < anim.length; k++) {
    const w = weights[k];
    if (w === 0) continue;
    const d = anim[k];
    for (let p = 0; p < pointCount; p++) {
      const dp = d.shapeDelta[p];
      if (!dp) continue;
      points[p][0] += dp[0] * w;
      points[p][1] += dp[1] * w;
    }
    for (let m = 0; m < 6; m++) affine[m] += d.affineDelta[m] * w;
    alpha += d.alphaDelta * w;
  }
  return {
    shape: { basePoints: points, closed: base.shape.closed },
    affine,
    alpha: clamp01(alpha),
    visible: base.visible,
  };
};

// ===== root group anim composition =====

export const composeRootGroupViewWithAnim = (
  base: InterpolatedRootGroupView,
  anim: RootGroupAnimKeyframe[],
  currentParams: Record<string, number>,
  sigma: number,
): InterpolatedRootGroupView => {
  if (anim.length === 0) return base;
  const weights = animRbfWeights(anim, currentParams, sigma);
  const anchor: Vec3 = [...base.anchor] as Vec3;
  const affine: AffineMatrix = [...base.affine] as AffineMatrix;
  let alpha = base.alpha;
  for (let k = 0; k < anim.length; k++) {
    const w = weights[k];
    if (w === 0) continue;
    const d = anim[k];
    anchor[0] += d.anchorDelta[0] * w;
    anchor[1] += d.anchorDelta[1] * w;
    anchor[2] += d.anchorDelta[2] * w;
    for (let m = 0; m < 6; m++) affine[m] += d.affineDelta[m] * w;
    alpha += d.alphaDelta * w;
  }
  return {
    anchor,
    affine,
    alpha: clamp01(alpha),
    visible: base.visible,
  };
};

// ===== child group anim composition =====

export const composeChildGroupViewWithAnim = (
  base: InterpolatedChildGroupView,
  anim: ChildGroupAnimKeyframe[],
  currentParams: Record<string, number>,
  sigma: number,
): InterpolatedChildGroupView => {
  if (anim.length === 0) return base;
  const weights = animRbfWeights(anim, currentParams, sigma);
  const affine: AffineMatrix = [...base.affine] as AffineMatrix;
  let alpha = base.alpha;
  for (let k = 0; k < anim.length; k++) {
    const w = weights[k];
    if (w === 0) continue;
    const d = anim[k];
    for (let m = 0; m < 6; m++) affine[m] += d.affineDelta[m] * w;
    alpha += d.alphaDelta * w;
  }
  return {
    affine,
    alpha: clamp01(alpha),
    visible: base.visible,
  };
};

// ===== empty anim keyframe builders =====

export const buildEmptyPartAnimKeyframe = (
  id: string,
  paramValues: Record<string, number>,
  shapePointCount: number,
): PartAnimKeyframe => ({
  id,
  paramValues,
  shapeDelta: Array.from({ length: shapePointCount }, () => [0, 0]),
  affineDelta: [...AFFINE_ZERO] as AffineMatrix,
  alphaDelta: 0,
});

export const buildEmptyRootGroupAnimKeyframe = (
  id: string,
  paramValues: Record<string, number>,
): RootGroupAnimKeyframe => ({
  id,
  paramValues,
  anchorDelta: [0, 0, 0],
  affineDelta: [...AFFINE_ZERO] as AffineMatrix,
  alphaDelta: 0,
});

export const buildEmptyChildGroupAnimKeyframe = (
  id: string,
  paramValues: Record<string, number>,
): ChildGroupAnimKeyframe => ({
  id,
  paramValues,
  affineDelta: [...AFFINE_ZERO] as AffineMatrix,
  alphaDelta: 0,
});

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
