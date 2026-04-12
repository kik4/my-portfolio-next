import { applyBlendShapePoints } from "./applyBlendShapes";
import { buildRBFInterpolator } from "./rbf";
import type { OutlinePolygon, Point2D, YawPitch } from "./types";

/**
 * Apply blend shapes then yaw/pitch keyframe interpolation to an OutlinePolygon.
 * Flow: basePoints → blend shapes → + RBF-interpolated deltas
 */
export function interpolateOutlinePoints(
  polygon: OutlinePolygon,
  angle: YawPitch,
  weights: Record<string, number>,
): Point2D[] {
  // 1. Apply blend shapes to base
  const blended = applyBlendShapePoints(
    polygon.basePoints,
    polygon.blendShapes,
    weights,
  );

  // 2. Apply yaw/pitch keyframe deltas
  if (polygon.yawPitchKeyframes.length === 0) {
    return blended;
  }

  const numPoints = blended.length;
  const interpolator = buildRBFInterpolator(
    polygon.yawPitchKeyframes.map((kf) => ({
      yaw: kf.angle.yaw,
      pitch: kf.angle.pitch,
      values: kf.deltas.flat(),
    })),
  );

  const flatDeltas = interpolator.interpolate(angle.yaw, angle.pitch);

  const result: Point2D[] = [];
  for (let i = 0; i < numPoints; i++) {
    result.push([
      blended[i][0] + (flatDeltas[i * 2] ?? 0),
      blended[i][1] + (flatDeltas[i * 2 + 1] ?? 0),
    ]);
  }
  return result;
}
