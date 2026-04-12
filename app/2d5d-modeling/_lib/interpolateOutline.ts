import { buildRBFInterpolator } from "./rbf";
import type { OutlinePolygon, Point2D, YawPitch } from "./types";

/**
 * Apply yaw/pitch keyframe interpolation to an OutlinePolygon.
 * Returns the interpolated points (basePoints + RBF-interpolated deltas).
 * If no keyframes exist, returns basePoints as-is.
 */
export function interpolateOutlinePoints(
  polygon: OutlinePolygon,
  angle: YawPitch,
): Point2D[] {
  const { basePoints, yawPitchKeyframes } = polygon;

  if (yawPitchKeyframes.length === 0) {
    return basePoints;
  }

  const numPoints = basePoints.length;

  // Build RBF interpolator: each keyframe's values are flattened deltas
  const interpolator = buildRBFInterpolator(
    yawPitchKeyframes.map((kf) => ({
      yaw: kf.angle.yaw,
      pitch: kf.angle.pitch,
      values: kf.deltas.flat(),
    })),
  );

  const flatDeltas = interpolator.interpolate(angle.yaw, angle.pitch);

  // Add interpolated deltas to basePoints
  const result: Point2D[] = [];
  for (let i = 0; i < numPoints; i++) {
    result.push([
      basePoints[i][0] + (flatDeltas[i * 2] ?? 0),
      basePoints[i][1] + (flatDeltas[i * 2 + 1] ?? 0),
    ]);
  }
  return result;
}
