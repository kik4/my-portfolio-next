import { buildRBFInterpolator } from "./rbf";
import type { FeaturePolygon, Mat2, Point2D, YawPitch } from "./types";
import { MAT2_IDENTITY } from "./types";

interface FeatureTransform {
  position: Point2D;
  matrix: Mat2;
  alpha: number;
}

/**
 * Interpolate a FeaturePolygon's affine transform and alpha at the given angle.
 * Returns the transformed points and final alpha.
 */
export function interpolateFeature(
  polygon: FeaturePolygon,
  angle: YawPitch,
): { points: Point2D[]; alpha: number } {
  const { basePoints, baseAlpha, yawPitchKeyframes } = polygon;

  let transform: FeatureTransform = {
    position: [0, 0],
    matrix: MAT2_IDENTITY,
    alpha: 1,
  };

  if (yawPitchKeyframes.length > 0) {
    // RBF interpolate: position(2) + matrix(4) + alpha(1) = 7 values
    const interpolator = buildRBFInterpolator(
      yawPitchKeyframes.map((kf) => ({
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

  const [m00, m01, m10, m11] = transform.matrix;
  const [tx, ty] = transform.position;

  const points: Point2D[] = basePoints.map(([x, y]) => [
    m00 * x + m01 * y + tx,
    m10 * x + m11 * y + ty,
  ]);

  return {
    points,
    alpha: baseAlpha * transform.alpha,
  };
}
