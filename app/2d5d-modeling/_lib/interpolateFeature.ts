import {
  applyBlendShapePoints,
  computeBlendShapeAlpha,
} from "./applyBlendShapes";
import { buildInterpolator } from "./buildInterpolator";
import type {
  FeaturePolygon,
  InterpolationMode,
  Mat2,
  Point2D,
  YawPitch,
} from "./types";
import { MAT2_IDENTITY } from "./types";

export interface FeatureInterpolationResult {
  blendedPoints: Point2D[]; // after blend shapes, before affine
  position: Point2D; // local translation
  matrix: Mat2; // local 2x2 affine
  alpha: number; // baseAlpha × keyframe alpha × blend alpha
}

/**
 * Interpolate a FeaturePolygon's blend shapes and affine transform.
 * Does NOT apply the affine to points (caller may compose with group transform first).
 */
export function interpolateFeature(
  polygon: FeaturePolygon,
  angle: YawPitch,
  weights: Record<string, number>,
  mode: InterpolationMode,
): FeatureInterpolationResult {
  // 1. Apply blend shapes to base
  const blendedPoints = applyBlendShapePoints(
    polygon.basePoints,
    polygon.blendShapes,
    weights,
  );

  // 2. Compute blend shape alpha
  const blendAlpha = computeBlendShapeAlpha(polygon.blendShapes, weights);

  // 3. Interpolate affine transform from keyframes
  let position: Point2D = [0, 0];
  let matrix: Mat2 = MAT2_IDENTITY;
  let kfAlpha = 1;

  if (polygon.yawPitchKeyframes.length > 0) {
    // Interpolate deltas from defaults to avoid Gaussian decay
    // position default=0, matrix default=identity, alpha default=1
    const interpolator = buildInterpolator(
      polygon.yawPitchKeyframes.map((kf) => ({
        yaw: kf.angle.yaw,
        pitch: kf.angle.pitch,
        values: [
          kf.position[0],
          kf.position[1],
          kf.matrix[0] - 1, // delta from identity
          kf.matrix[1],
          kf.matrix[2],
          kf.matrix[3] - 1, // delta from identity
          kf.alpha - 1, // delta from 1
        ],
      })),
      mode,
    );

    const v = interpolator.interpolate(angle.yaw, angle.pitch);
    position = [v[0], v[1]];
    matrix = [v[2] + 1, v[3], v[4], v[5] + 1]; // add identity back
    kfAlpha = Math.max(0, Math.min(1, v[6] + 1)); // add 1 back
  }

  const alpha = Math.max(
    0,
    Math.min(1, polygon.baseAlpha * kfAlpha * blendAlpha),
  );

  return { blendedPoints, position, matrix, alpha };
}
