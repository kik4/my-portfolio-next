import {
  applyBlendShapePoints,
  computeBlendShapeAlpha,
} from "./applyBlendShapes";
import { buildRBFInterpolator } from "./rbf";
import type { FeaturePolygon, Mat2, Point2D, YawPitch } from "./types";
import { MAT2_IDENTITY } from "./types";

interface FeatureTransform {
  position: Point2D;
  matrix: Mat2;
  alpha: number;
}

/**
 * Interpolate a FeaturePolygon.
 * Flow: basePoints → blend shapes → affine transform (from yaw/pitch keyframes)
 * Alpha: baseAlpha × keyframe alpha × blend shape alpha
 */
export function interpolateFeature(
  polygon: FeaturePolygon,
  angle: YawPitch,
  weights: Record<string, number>,
): { points: Point2D[]; alpha: number } {
  // 1. Apply blend shapes to base
  const blended = applyBlendShapePoints(
    polygon.basePoints,
    polygon.blendShapes,
    weights,
  );

  // 2. Compute blend shape alpha
  const blendAlpha = computeBlendShapeAlpha(polygon.blendShapes, weights);

  // 3. Interpolate affine transform from keyframes
  let transform: FeatureTransform = {
    position: [0, 0],
    matrix: MAT2_IDENTITY,
    alpha: 1,
  };

  if (polygon.yawPitchKeyframes.length > 0) {
    const interpolator = buildRBFInterpolator(
      polygon.yawPitchKeyframes.map((kf) => ({
        yaw: kf.angle.yaw,
        pitch: kf.angle.pitch,
        values: [
          kf.position[0],
          kf.position[1],
          kf.matrix[0],
          kf.matrix[1],
          kf.matrix[2],
          kf.matrix[3],
          kf.alpha,
        ],
      })),
    );

    const v = interpolator.interpolate(angle.yaw, angle.pitch);
    transform = {
      position: [v[0], v[1]],
      matrix: [v[2], v[3], v[4], v[5]],
      alpha: Math.max(0, Math.min(1, v[6])),
    };
  }

  // 4. Apply affine transform
  const [m00, m01, m10, m11] = transform.matrix;
  const [tx, ty] = transform.position;
  const points: Point2D[] = blended.map(([x, y]) => [
    m00 * x + m01 * y + tx,
    m10 * x + m11 * y + ty,
  ]);

  // 5. Combine alpha: baseAlpha × keyframe alpha × blend alpha
  const alpha = polygon.baseAlpha * transform.alpha * blendAlpha;

  return { points, alpha: Math.max(0, Math.min(1, alpha)) };
}
