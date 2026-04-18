import { applyBlendShapePoints } from "./applyBlendShapes";
import { buildInterpolator } from "./buildInterpolator";
import type {
  InterpolationMode,
  OutlinePolygon,
  Point2D,
  YawPitch,
} from "./types";

/**
 * Apply blend shapes then yaw/pitch keyframe interpolation to an OutlinePolygon.
 * Flow: basePoints → blend shapes → + RBF-interpolated deltas
 *
 * When mirrorSymmetric is true and yaw is negative, the yaw>=0 side is sampled
 * (by flipping the sign of yaw for the interpolation lookup) and the resulting
 * points are mirrored along x. basePoints themselves are not mirrored so the
 * frontal (yaw=0) shape is preserved as authored.
 */
export function interpolateOutlinePoints(
  polygon: OutlinePolygon,
  angle: YawPitch,
  weights: Record<string, number>,
  mode: InterpolationMode,
): Point2D[] {
  // 1. Apply blend shapes to base
  const blended = applyBlendShapePoints(
    polygon.basePoints,
    polygon.blendShapes,
    weights,
  );

  const mirror = polygon.mirrorSymmetric === true && angle.yaw < 0;
  const lookupYaw = mirror ? -angle.yaw : angle.yaw;

  // 2. Apply yaw/pitch keyframe deltas
  if (polygon.yawPitchKeyframes.length === 0) {
    return mirror ? blended.map(([x, y]) => [-x, y] as Point2D) : blended;
  }

  const numPoints = blended.length;
  const interpolator = buildInterpolator(
    polygon.yawPitchKeyframes.map((kf) => ({
      yaw: kf.angle.yaw,
      pitch: kf.angle.pitch,
      values: kf.deltas.flat(),
    })),
    mode,
  );

  const flatDeltas = interpolator.interpolate(lookupYaw, angle.pitch);

  const result: Point2D[] = [];
  for (let i = 0; i < numPoints; i++) {
    const x = blended[i][0] + (flatDeltas[i * 2] ?? 0);
    const y = blended[i][1] + (flatDeltas[i * 2 + 1] ?? 0);
    result.push(mirror ? [-x, y] : [x, y]);
  }
  return result;
}
