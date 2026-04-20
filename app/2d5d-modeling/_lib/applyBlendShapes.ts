import type { FeatureBlendShape, OutlineBlendShape, Point2D } from "./types";

/**
 * Apply blend shapes to base points.
 * Returns new points = basePoints + Σ (blendShape.deltas × weight).
 */
export function applyBlendShapePoints(
  basePoints: Point2D[],
  blendShapes: (OutlineBlendShape | FeatureBlendShape)[],
  weights: Record<string, number>,
): Point2D[] {
  const result: Point2D[] = basePoints.map(([x, y, s]) => [x, y, s ?? 1]);

  for (const bs of blendShapes) {
    const w = weights[bs.id] ?? 0;
    if (w === 0) continue;
    for (let i = 0; i < result.length && i < bs.deltas.length; i++) {
      result[i][0] += bs.deltas[i][0] * w;
      result[i][1] += bs.deltas[i][1] * w;
      result[i][2] += (bs.deltas[i][2] ?? 0) * w;
    }
  }

  return result;
}

/**
 * Compute alpha contribution from feature blend shapes.
 * Returns clamped multiplier: 1 + Σ (alphaDelta × weight), clamped to [0, 1].
 */
export function computeBlendShapeAlpha(
  blendShapes: FeatureBlendShape[],
  weights: Record<string, number>,
): number {
  let alpha = 1;
  for (const bs of blendShapes) {
    const w = weights[bs.id] ?? 0;
    alpha += bs.alphaDelta * w;
  }
  return Math.max(0, Math.min(1, alpha));
}
